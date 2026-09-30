import { Prisma } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { prisma } from '../config/database.js';
import { integrationRepository } from '../repositories/integration.repository.js';
import { auditEventRepository } from '../repositories/audit-event.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { rulesService } from '../services/rules.service.js';
import { getSlackNotifier } from '../providers/slack/index.js';
import { encryptToken, decryptToken } from '../providers/encryption.js';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';

export class IntegrationService {
  async listIntegrations(workspaceId: string) {
    const list = await integrationRepository.listByWorkspace(workspaceId);

    const defaultProviders = ['github', 'gitlab', 'slack'];
    const result: Record<
      string,
      {
        provider: string;
        status: string;
        connectedAs: string | null;
        lastSyncedAt: string | null;
        config: unknown;
      }
    > = {};

    for (const p of defaultProviders) {
      result[p] = {
        provider: p,
        status: 'disconnected',
        connectedAs: null,
        lastSyncedAt: null,
        config: null
      };
    }

    for (const item of list) {
      result[item.provider] = {
        provider: item.provider,
        status: item.status,
        connectedAs: item.connectedAs,
        lastSyncedAt: item.lastSyncedAt ? item.lastSyncedAt.toISOString() : null,
        config: item.config
      };
    }

    return Object.values(result);
  }

  async connect(
    workspaceId: string,
    actorId: string | null,
    provider: string,
    options?: string | { token?: string; username?: string; repoFullName?: string }
  ) {
    const validProviders = ['github', 'gitlab', 'slack'];
    if (!validProviders.includes(provider)) {
      const err = new Error(`Unsupported integration provider: ${provider}`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BAD_REQUEST;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    let tokenInput: string | undefined;
    let usernameInput: string | undefined;
    let repoFullNameInput: string | undefined;

    if (typeof options === 'string') {
      tokenInput = options;
    } else if (typeof options === 'object' && options !== null) {
      tokenInput = options.token;
      usernameInput = options.username;
      repoFullNameInput = options.repoFullName;
    }

    let connectedAs = '@mock-service-bot';
    let config: Record<string, unknown> = {};
    let rawTokenToEncrypt = 'mock_secret_token';

    if (provider === 'github') {
      if (tokenInput && tokenInput.trim()) {
        try {
          const octokit = new Octokit({ auth: tokenInput.trim() });
          const { data: ghUser } = await octokit.rest.users.getAuthenticated();
          connectedAs = `@${ghUser.login}`;
          config = {
            accountType: ghUser.type || 'GitHub User',
            username: ghUser.login,
            avatarUrl: ghUser.avatar_url,
            isLive: true,
            hasToken: true
          };
          rawTokenToEncrypt = tokenInput.trim();

          // Auto-sync top updated repos
          try {
            const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
              per_page: 5,
              sort: 'updated'
            });
            for (const r of repos) {
              const repo = await repositoryRepository.upsert(workspaceId, {
                fullName: r.full_name,
                defaultBranch: r.default_branch || 'main',
                provider: 'github',
                externalId: String(r.id)
              });
              await this.scanRepositoryBranches(workspaceId, repo, rawTokenToEncrypt);
            }
          } catch (e) {
            logger.warn({ err: e }, 'Could not list repositories on GitHub connect');
          }
        } catch (e: any) {
          const err = new Error('Invalid GitHub token. Please verify your Personal Access Token.');
          (err as any).code = ERROR_CODES.BAD_REQUEST;
          (err as any).status = 400;
          throw err;
        }
      } else if (usernameInput && usernameInput.trim()) {
        try {
          const octokit = new Octokit();
          const cleanUser = usernameInput.trim().replace(/^@/, '');
          const { data: ghUser } = await octokit.rest.users.getByUsername({ username: cleanUser });
          connectedAs = `@${ghUser.login}`;
          config = {
            accountType: ghUser.type || 'GitHub User',
            username: ghUser.login,
            avatarUrl: ghUser.avatar_url,
            isLive: true,
            hasToken: false
          };

          try {
            const { data: repos } = await octokit.rest.repos.listForUser({
              username: ghUser.login,
              per_page: 5,
              sort: 'updated'
            });
            for (const r of repos) {
              const repo = await repositoryRepository.upsert(workspaceId, {
                fullName: r.full_name,
                defaultBranch: r.default_branch || 'main',
                provider: 'github',
                externalId: String(r.id)
              });
              await this.scanRepositoryBranches(workspaceId, repo);
            }
          } catch (e) {
            logger.warn({ err: e }, 'Could not list user public repos');
          }
        } catch (e: any) {
          const err = new Error(`GitHub user '@${usernameInput}' not found on GitHub.`);
          (err as any).code = ERROR_CODES.NOT_FOUND;
          (err as any).status = 404;
          throw err;
        }
      } else if (repoFullNameInput && repoFullNameInput.trim()) {
        try {
          const [owner, rName] = repoFullNameInput.trim().split('/');
          const octokit = new Octokit();
          const { data: ghRepo } = await octokit.rest.repos.get({ owner: owner!, repo: rName! });
          connectedAs = `@${ghRepo.owner?.login || owner}`;
          config = {
            accountType: ghRepo.owner?.type || 'User',
            username: ghRepo.owner?.login || owner,
            repository: ghRepo.full_name,
            isLive: true
          };
          const repo = await repositoryRepository.upsert(workspaceId, {
            fullName: ghRepo.full_name,
            defaultBranch: ghRepo.default_branch || 'main',
            provider: 'github',
            externalId: String(ghRepo.id)
          });
          await this.scanRepositoryBranches(workspaceId, repo);
        } catch (e: any) {
          const err = new Error(`Repository '${repoFullNameInput}' not found on GitHub.`);
          (err as any).code = ERROR_CODES.NOT_FOUND;
          (err as any).status = 404;
          throw err;
        }
      } else {
        // Fallback default
        connectedAs = '@pruner-bot-ci';
        config = { accountType: 'GitHub Enterprise Org', organization: 'acme-org' };
      }
    } else if (provider === 'gitlab') {
      connectedAs = '@gitlab-admin-svc';
      config = { accountType: 'Self-Hosted or SaaS' };
    } else if (provider === 'slack') {
      connectedAs = '@devops-notify';
      config = {
        channel: '#git-hygiene',
        availableChannels: ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage']
      };
    }

    const encryptedToken = encryptToken(rawTokenToEncrypt);

    const updated = await integrationRepository.upsert(workspaceId, provider, {
      status: 'connected',
      connectedAs,
      encryptedToken,
      config: config as Prisma.InputJsonValue,
      lastSyncedAt: new Date()
    });

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'INTEGRATION_CONNECT',
      payload: { provider, connectedAs },
      dryRun: settings?.dryRun ?? false
    });

    return {
      provider: updated.provider,
      status: updated.status,
      connectedAs: updated.connectedAs,
      lastSyncedAt: updated.lastSyncedAt?.toISOString() || null,
      config: updated.config
    };
  }

  async scanAndImportRepository(workspaceId: string, repoFullName: string, tokenOverride?: string) {
    const [owner, repoName] = repoFullName.trim().split('/');
    if (!owner || !repoName) {
      const err = new Error('Invalid repository name. Format must be owner/repo.');
      (err as any).code = ERROR_CODES.BAD_REQUEST;
      (err as any).status = 400;
      throw err;
    }

    let token = tokenOverride;
    if (tokenOverride && tokenOverride.trim()) {
      try {
        await integrationRepository.upsert(workspaceId, 'github', {
          encryptedToken: encryptToken(tokenOverride.trim()),
          status: 'connected',
          connectedAs: `@${owner}`
        });
      } catch (e) {
        // ignore
      }
    } else {
      const existingIntegration = await integrationRepository.findByProvider(workspaceId, 'github');
      if (existingIntegration?.encryptedToken) {
        try {
          const dec = decryptToken(existingIntegration.encryptedToken);
          if (dec && dec !== 'mock_secret_token') {
            token = dec;
          }
        } catch {
          // ignore
        }
      }
    }

    const octokit = new Octokit({ auth: token || undefined });
    const { data: ghRepo } = await octokit.rest.repos.get({ owner, repo: repoName });

    const repo = await repositoryRepository.upsert(workspaceId, {
      fullName: ghRepo.full_name,
      defaultBranch: ghRepo.default_branch || 'main',
      provider: 'github',
      externalId: String(ghRepo.id)
    });

    const scannedBranches = await this.scanRepositoryBranches(workspaceId, repo, token);
    const staleCount = scannedBranches.filter((b) => b.status === 'flagged').length;

    return {
      repository: repo,
      branchesCount: scannedBranches.length,
      staleCount,
      branches: scannedBranches
    };
  }

  async scanRepositoryBranches(workspaceId: string, repo: any, token?: string) {
    const octokit = new Octokit({ auth: token || undefined });
    const [owner, repoName] = repo.fullName.split('/');

    try {
      const { data: branches } = await octokit.rest.repos.listBranches({
        owner: owner!,
        repo: repoName!,
        per_page: 30
      });

      const settings = await settingsRepository.findByWorkspaceId(workspaceId);
      const staleAfterDays = settings?.staleAfterDays ?? 30;
      const staleThresholdMs = staleAfterDays * 86400000;
      const now = Date.now();
      const results: any[] = [];

      for (const b of branches) {
        if (b.name === repo.defaultBranch) continue;
        const isProtected = await rulesService.matchesAnyPattern(workspaceId, b.name);

        let commitDate = new Date();
        let author = 'github-user';

        try {
          const { data: commit } = await octokit.rest.repos.getCommit({
            owner: owner!,
            repo: repoName!,
            ref: b.commit.sha
          });
          if (commit.commit.committer?.date) {
            commitDate = new Date(commit.commit.committer.date);
          }
          author = commit.commit.author?.name || commit.author?.login || 'github-user';
        } catch {
          // Commit lookup fallback
        }

        const idleMs = now - commitDate.getTime();
        const isStale = idleMs >= staleThresholdMs;

        const existing = await prisma.branch.findUnique({
          where: {
            repositoryId_name: {
              repositoryId: repo.id,
              name: b.name
            }
          }
        });

        const status = isProtected ? 'protected' : isStale ? 'flagged' : 'active';
        const flaggedAt = isStale && !isProtected ? new Date(now) : null;
        const deadlineAt = isStale && !isProtected ? new Date(now + 7 * 86400000) : null;

        let record;
        if (!existing) {
          record = await prisma.branch.create({
            data: {
              repositoryId: repo.id,
              name: b.name,
              author,
              lastCommitSha: b.commit.sha,
              lastCommitAt: commitDate,
              status,
              flaggedAt,
              deadlineAt
            }
          });
        } else {
          record = await prisma.branch.update({
            where: { id: existing.id },
            data: {
              author,
              lastCommitSha: b.commit.sha,
              lastCommitAt: commitDate,
              status,
              flaggedAt: existing.flaggedAt || flaggedAt,
              deadlineAt: existing.deadlineAt || deadlineAt
            }
          });
        }
        results.push(record);
      }
      return results;
    } catch (e) {
      logger.warn({ err: e, repo: repo.fullName }, 'Failed to scan repository branches');
      return [];
    }
  }

  async disconnect(workspaceId: string, actorId: string | null, provider: string) {
    const existing = await integrationRepository.findByProvider(workspaceId, provider);
    if (!existing) {
      const err = new Error(`Integration for '${provider}' not found`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    await integrationRepository.disconnect(workspaceId, provider);

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'INTEGRATION_DISCONNECT',
      payload: { provider },
      dryRun: settings?.dryRun ?? false
    });

    return {
      provider,
      status: 'disconnected',
      connectedAs: null,
      lastSyncedAt: null,
      config: null
    };
  }

  async getSlackChannels(workspaceId: string) {
    const integration = await integrationRepository.findByProvider(workspaceId, 'slack');
    if (!integration || integration.status !== 'connected') {
      return ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'];
    }

    const config = integration.config as { availableChannels?: string[] } | null;
    if (config?.availableChannels && config.availableChannels.length > 0) {
      return config.availableChannels;
    }

    const notifier = getSlackNotifier();
    return notifier.listChannels();
  }

  async updateSlackChannel(workspaceId: string, actorId: string | null, channel: string) {
    const integration = await integrationRepository.findByProvider(workspaceId, 'slack');
    if (!integration) {
      const err = new Error('Slack integration not configured');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    const previousConfig = (integration.config as Record<string, unknown>) || {};
    const newConfig = {
      ...previousConfig,
      channel
    };

    await integrationRepository.updateConfig(workspaceId, 'slack', newConfig);

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'SLACK_CHANNEL_UPDATE',
      payload: { channel },
      dryRun: settings?.dryRun ?? false
    });

    return { success: true, channel };
  }

  async sendSlackTest(workspaceId: string) {
    const integration = await integrationRepository.findByProvider(workspaceId, 'slack');
    if (!integration || integration.status !== 'connected') {
      const err = new Error('Slack is disconnected');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.SLACK_NOT_CONNECTED;
      (err as unknown as { code: string; status: number }).status = 409;
      throw err;
    }

    const config = (integration.config as { channel?: string }) || {};
    const channel = config.channel || env.SLACK_DEFAULT_CHANNEL;

    const notifier = getSlackNotifier();
    await notifier.sendTestAlert(channel);

    return { success: true, channel };
  }
}

export const integrationService = new IntegrationService();
