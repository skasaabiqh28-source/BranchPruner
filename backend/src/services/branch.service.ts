import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { snapshotRepository } from '../repositories/snapshot.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { auditEventRepository } from '../repositories/audit-event.repository.js';
import { integrationRepository } from '../repositories/integration.repository.js';
import { rulesService } from './rules.service.js';
import { getGitProvider } from '../providers/git/index.js';
import { getSlackNotifier } from '../providers/slack/index.js';
import { decryptToken } from '../providers/encryption.js';
import { env } from '../config/env.js';
import { APP_CONSTANTS, ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';

// In-memory idempotency cache for prune requests (Idempotency-Key -> Response)
const idempotencyStore = new Map<string, { timestamp: number; response: unknown }>();

export class BranchService {
  async listPendingBranches(
    workspaceId: string,
    query: {
      search?: string;
      repoId?: string;
      sort?: 'timeLeft' | 'staleness' | 'branchName';
      order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const sort = query.sort || 'timeLeft';
    const order = query.order || 'asc';

    const { items: allFlagged } = await branchRepository.listFlaggedByWorkspace(workspaceId, {
      search: query.search,
      repoId: query.repoId,
      page: 1, // fetch all flagged to filter out protected patterns in memory
      limit: 1000,
      sortBy: sort,
      order
    });

    const now = Date.now();
    const filteredBranches: Array<{
      id: string;
      repository: { id: string; fullName: string };
      branchName: string;
      author: string;
      stalenessDays: number;
      deadlineAt: string;
      timeLeftSeconds: number;
      isUrgent: boolean;
    }> = [];

    for (const b of allFlagged) {
      // Check if branch matches any protected pattern in workspace
      const isProtected = await rulesService.matchesAnyPattern(workspaceId, b.name);
      if (isProtected) {
        continue;
      }

      const stalenessDays = Math.max(0, Math.floor((now - b.lastCommitAt.getTime()) / 86400000));
      const deadlineAt = b.deadlineAt || new Date(b.flaggedAt ? b.flaggedAt.getTime() + 7 * 86400000 : now + 7 * 86400000);
      const timeLeftSeconds = Math.max(0, Math.floor((deadlineAt.getTime() - now) / 1000));
      const isUrgent = timeLeftSeconds <= APP_CONSTANTS.URGENT_THRESHOLD_HOURS * 3600;

      filteredBranches.push({
        id: b.id,
        repository: {
          id: b.repository.id,
          fullName: b.repository.fullName
        },
        branchName: b.name,
        author: b.author,
        stalenessDays,
        deadlineAt: deadlineAt.toISOString(),
        timeLeftSeconds,
        isUrgent
      });
    }

    // Apply sorting
    filteredBranches.sort((a, b) => {
      let comparison = 0;
      if (sort === 'timeLeft') {
        comparison = a.timeLeftSeconds - b.timeLeftSeconds;
      } else if (sort === 'staleness') {
        comparison = a.stalenessDays - b.stalenessDays;
      } else if (sort === 'branchName') {
        comparison = a.branchName.localeCompare(b.branchName);
      }
      return order === 'desc' ? -comparison : comparison;
    });

    const paginatedItems = filteredBranches.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      total: filteredBranches.length,
      page,
      limit,
      totalPages: Math.ceil(filteredBranches.length / limit) || 1
    };
  }

  async notifySlack(workspaceId: string, actorId: string | null, branchId: string) {
    const branch = await branchRepository.findInWorkspace(workspaceId, branchId);
    if (!branch) {
      const err = new Error('Branch not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    const slackIntegration = await integrationRepository.findByProvider(workspaceId, 'slack');
    if (!slackIntegration || slackIntegration.status !== 'connected') {
      const err = new Error('Cannot notify: Slack is disconnected. Enable it in VCS & Webhooks tab.');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.SLACK_NOT_CONNECTED;
      (err as unknown as { code: string; status: number }).status = 409;
      throw err;
    }

    const config = slackIntegration.config as { channel?: string } | null;
    const channel = config?.channel || env.SLACK_DEFAULT_CHANNEL;

    const now = Date.now();
    const stalenessDays = Math.max(0, Math.floor((now - branch.lastCommitAt.getTime()) / 86400000));
    const deadlineAt = branch.deadlineAt || new Date(now + 7 * 86400000);
    const timeLeftHours = Math.max(0, Math.round((deadlineAt.getTime() - now) / 3600000));

    const notifier = getSlackNotifier();
    await notifier.sendWarning(channel, {
      branchName: branch.name,
      repoFullName: branch.repository.fullName,
      author: branch.author,
      daysStale: stalenessDays,
      timeLeftHours,
      deadlineAt
    });

    await branchRepository.updateStatus(branch.id, branch.status, { warnedAt: new Date() });

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'NOTIFY_SLACK',
      payload: {
        branchId: branch.id,
        branchName: branch.name,
        channel,
        author: branch.author
      },
      dryRun: settings?.dryRun ?? false
    });

    return {
      success: true,
      message: `Alert sent to ${channel} for branch author @${branch.author}`,
      channel
    };
  }

  async keepBranch(workspaceId: string, actorId: string | null, branchId: string) {
    const branch = await branchRepository.findInWorkspace(workspaceId, branchId);
    if (!branch) {
      const err = new Error('Branch not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);
    const staleAfterDays = settings?.staleAfterDays ?? APP_CONSTANTS.STALE_AFTER_DAYS_DEFAULT;
    const keptUntil = new Date(Date.now() + staleAfterDays * 86400000);

    // Save previous status and deadline for undo
    await branchRepository.updateStatus(branch.id, 'kept', { keptUntil });

    // Generate 10-second signed undo token
    const undoExpiresAt = new Date(Date.now() + APP_CONSTANTS.UNDO_TOKEN_EXPIRES_IN_SECONDS * 1000);
    const undoToken = jwt.sign(
      {
        action: 'undo-keep',
        branchId: branch.id,
        workspaceId,
        previousFlaggedAt: branch.flaggedAt,
        previousDeadlineAt: branch.deadlineAt
      },
      env.JWT_SECRET,
      { expiresIn: `${APP_CONSTANTS.UNDO_TOKEN_EXPIRES_IN_SECONDS}s` }
    );

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'KEEP_BRANCH',
      payload: {
        branchId: branch.id,
        branchName: branch.name,
        keptUntil: keptUntil.toISOString(),
        gracePeriodDays: staleAfterDays
      },
      dryRun: settings?.dryRun ?? false
    });

    return {
      undoToken,
      undoExpiresAt: undoExpiresAt.toISOString(),
      keptUntil: keptUntil.toISOString()
    };
  }

  async undoKeepBranch(workspaceId: string, actorId: string | null, branchId: string, undoToken: string) {
    let payload: {
      action: string;
      branchId: string;
      workspaceId: string;
      previousFlaggedAt?: string;
      previousDeadlineAt?: string;
    };

    try {
      payload = jwt.verify(undoToken, env.JWT_SECRET) as typeof payload;
    } catch {
      const err = new Error('Undo window expired (10s limit exceeded)');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.TOKEN_EXPIRED;
      (err as unknown as { code: string; status: number }).status = 410;
      throw err;
    }

    if (payload.branchId !== branchId || payload.workspaceId !== workspaceId) {
      const err = new Error('Invalid undo token');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.INVALID_TOKEN;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    const branch = await branchRepository.findInWorkspace(workspaceId, branchId);
    if (!branch) {
      const err = new Error('Branch not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    // Restore flagged status and original deadline
    const flaggedAt = payload.previousFlaggedAt ? new Date(payload.previousFlaggedAt) : branch.flaggedAt;
    const deadlineAt = payload.previousDeadlineAt ? new Date(payload.previousDeadlineAt) : branch.deadlineAt;

    await branchRepository.updateStatus(branch.id, 'flagged', {
      flaggedAt,
      deadlineAt,
      keptUntil: null
    });

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'UNDO_KEEP',
      payload: {
        branchId: branch.id,
        branchName: branch.name,
        restoredStatus: 'flagged'
      },
      dryRun: settings?.dryRun ?? false
    });

    return {
      success: true,
      message: `Restored ${branch.name} to remediation queue`
    };
  }

  async pruneBranch(
    workspaceId: string,
    actorId: string | null,
    branchId: string,
    confirm: boolean,
    idempotencyKey?: string
  ) {
    if (!confirm) {
      const err = new Error('Prune confirmation is required (confirm: true)');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BAD_REQUEST;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    // Check Idempotency-Key
    if (idempotencyKey) {
      const cached = idempotencyStore.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return cached.response;
      }
    }

    const branch = await branchRepository.findInWorkspace(workspaceId, branchId);
    if (!branch) {
      const err = new Error('Branch not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    // 1. Validate branch is flagged
    if (branch.status !== 'flagged') {
      const err = new Error(`Cannot prune branch with status '${branch.status}'`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BAD_REQUEST;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    // 2. Validate not default branch
    if (branch.name === branch.repository.defaultBranch) {
      const err = new Error(`Cannot prune repository default branch: ${branch.name}`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_IS_DEFAULT;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    // 3. Validate not protected
    const isProtected = await rulesService.matchesAnyPattern(workspaceId, branch.name);
    if (isProtected) {
      const err = new Error(`Branch '${branch.name}' matches a protected guardrail pattern`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_PROTECTED;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);
    const isDryRun = settings?.dryRun ?? true;

    // DRY-RUN CHECK
    if (isDryRun) {
      await auditEventRepository.create({
        workspaceId,
        actorId,
        type: 'PRUNE_BRANCH',
        payload: {
          simulated: true,
          branchId: branch.id,
          branchName: branch.name,
          repository: branch.repository.fullName,
          sha: branch.lastCommitSha
        },
        dryRun: true
      });

      const response = {
        dryRun: true,
        wouldDo: 'prune' as const,
        target: {
          id: branch.id,
          branchName: branch.name,
          repo: branch.repository.fullName
        }
      };

      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, { timestamp: Date.now(), response });
      }

      return response;
    }

    // LIVE PRUNE FLOW
    const ghIntegration = await integrationRepository.findByProvider(workspaceId, 'github');
    let ghToken: string | undefined;
    let isLiveGh = false;
    if (ghIntegration?.encryptedToken) {
      try {
        const dec = decryptToken(ghIntegration.encryptedToken);
        if (dec && dec !== 'mock_secret_token') {
          ghToken = dec;
          isLiveGh = true;
        }
      } catch {
        // ignore
      }
    }

    const provider = getGitProvider(branch.repository.defaultBranch ? 'github' : 'github', isLiveGh);
    let archiveRefCreated: string | null = null;

    try {
      // Step 2: Create archive ref pointing at lastCommitSha. Abort if this fails.
      archiveRefCreated = ghToken
        ? await provider.createArchiveRef(branch.repository.fullName, branch.name, branch.lastCommitSha, ghToken)
        : await provider.createArchiveRef(branch.repository.fullName, branch.name, branch.lastCommitSha);

      // Step 3: Delete remote branch. If deletion fails, rollback archive ref.
      if (ghToken) {
        await provider.deleteBranch(branch.repository.fullName, branch.name, ghToken);
      } else {
        await provider.deleteBranch(branch.repository.fullName, branch.name);
      }
    } catch (gitErr) {
      if (archiveRefCreated && provider.deleteArchiveRef) {
        logger.warn({ archiveRefCreated }, 'Prune deletion failed, rolling back archive ref');
        if (ghToken) {
          await provider.deleteArchiveRef(branch.repository.fullName, archiveRefCreated, ghToken);
        } else {
          await provider.deleteArchiveRef(branch.repository.fullName, archiveRefCreated);
        }
      }
      const err = new Error(`Git remote ref operation failed: ${(gitErr as Error).message}`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.PROVIDER_ERROR;
      (err as unknown as { code: string; status: number }).status = 502;
      throw err;
    }

    // Step 4: In one DB transaction: set branch status=pruned, create Snapshot, write AuditEvent.
    const result = await prisma.$transaction(async (tx) => {
      const updatedBranch = await tx.branch.update({
        where: { id: branch.id },
        data: { status: 'pruned' }
      });

      const snapshot = await tx.snapshot.create({
        data: {
          repositoryId: branch.repository.id,
          branchName: branch.name,
          archivedCommitSha: branch.lastCommitSha,
          archiveRef: archiveRefCreated!,
          prunedBy: actorId ? 'user' : 'scheduler',
          status: 'archived'
        }
      });

      await tx.auditEvent.create({
        data: {
          workspaceId,
          actorId,
          type: 'PRUNE_BRANCH',
          payload: {
            branchId: branch.id,
            branchName: branch.name,
            archiveRef: archiveRefCreated,
            commitHash: branch.lastCommitSha,
            snapshotId: snapshot.id
          },
          dryRun: false
        }
      });

      return { updatedBranch, snapshot };
    });

    const response = {
      success: true,
      branchId: result.updatedBranch.id,
      branchName: result.updatedBranch.name,
      archiveRef: archiveRefCreated,
      commitHash: result.snapshot.archivedCommitSha,
      snapshotId: result.snapshot.id
    };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { timestamp: Date.now(), response });
    }

    return response;
  }

  async restoreBranch(workspaceId: string, actorId: string | null, snapshotId: string) {
    const snapshot = await snapshotRepository.findByIdInWorkspace(workspaceId, snapshotId);
    if (!snapshot) {
      const err = new Error('Snapshot not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.SNAPSHOT_NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    if (snapshot.status === 'restored') {
      return {
        success: true,
        alreadyRestored: true,
        message: `Branch '${snapshot.branchName}' has already been restored`,
        snapshotId: snapshot.id,
        branchName: snapshot.branchName,
        commitHash: snapshot.archivedCommitSha
      };
    }

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);
    const isDryRun = settings?.dryRun ?? true;

    // DRY-RUN CHECK
    if (isDryRun) {
      await auditEventRepository.create({
        workspaceId,
        actorId,
        type: 'RESTORE_BRANCH',
        payload: {
          simulated: true,
          snapshotId: snapshot.id,
          branchName: snapshot.branchName,
          repository: snapshot.repository.fullName,
          sha: snapshot.archivedCommitSha
        },
        dryRun: true
      });

      return {
        dryRun: true,
        wouldDo: 'restore' as const,
        target: {
          id: snapshot.id,
          branchName: snapshot.branchName,
          repo: snapshot.repository.fullName
        }
      };
    }

    // LIVE RESTORE FLOW
    const ghIntegration = await integrationRepository.findByProvider(workspaceId, 'github');
    let ghToken: string | undefined;
    let isLiveGh = false;
    if (ghIntegration?.encryptedToken) {
      try {
        const dec = decryptToken(ghIntegration.encryptedToken);
        if (dec && dec !== 'mock_secret_token') {
          ghToken = dec;
          isLiveGh = true;
        }
      } catch {
        // ignore
      }
    }

    const provider = getGitProvider('github', isLiveGh);

    try {
      // Recreate branch on provider from archivedCommitSha
      if (ghToken) {
        await provider.createBranchFromSha(
          snapshot.repository.fullName,
          snapshot.branchName,
          snapshot.archivedCommitSha,
          ghToken
        );
      } else {
        await provider.createBranchFromSha(
          snapshot.repository.fullName,
          snapshot.branchName,
          snapshot.archivedCommitSha
        );
      }
    } catch (gitErr: unknown) {
      if ((gitErr as { status?: number }).status === 409) {
        const conflictErr = new Error(`Branch '${snapshot.branchName}' already exists on remote`);
        (conflictErr as unknown as { code: string; status: number }).code = ERROR_CODES.BRANCH_EXISTS;
        (conflictErr as unknown as { code: string; status: number }).status = 409;
        throw conflictErr;
      }
      throw gitErr;
    }

    // In DB transaction: mark Snapshot as restored, write AuditEvent, restore branch
    await prisma.$transaction(async (tx) => {
      await tx.snapshot.update({
        where: { id: snapshot.id },
        data: {
          status: 'restored',
          restoredAt: new Date()
        }
      });

      // Upsert branch record back to active
      await tx.branch.upsert({
        where: {
          repositoryId_name: {
            repositoryId: snapshot.repository.id,
            name: snapshot.branchName
          }
        },
        update: {
          status: 'active',
          lastCommitSha: snapshot.archivedCommitSha,
          lastCommitAt: new Date(),
          flaggedAt: null,
          deadlineAt: null,
          warnedAt: null
        },
        create: {
          repositoryId: snapshot.repository.id,
          name: snapshot.branchName,
          author: 'restored-ref',
          lastCommitSha: snapshot.archivedCommitSha,
          lastCommitAt: new Date(),
          status: 'active'
        }
      });

      await tx.auditEvent.create({
        data: {
          workspaceId,
          actorId,
          type: 'RESTORE_BRANCH',
          payload: {
            snapshotId: snapshot.id,
            branchName: snapshot.branchName,
            restoredCommitSha: snapshot.archivedCommitSha
          },
          dryRun: false
        }
      });
    });

    return {
      success: true,
      snapshotId: snapshot.id,
      branchName: snapshot.branchName,
      commitHash: snapshot.archivedCommitSha
    };
  }

  async listActivity(
    workspaceId: string,
    query: {
      repoId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));

    const { items, total } = await snapshotRepository.listByWorkspace(workspaceId, {
      repoId: query.repoId,
      page,
      limit
    });

    const mapped = items.map((act) => ({
      id: act.id,
      repository: {
        id: act.repository.id,
        fullName: act.repository.fullName
      },
      prunedBranch: act.branchName,
      archivedCommitHash: act.archivedCommitSha,
      prunedAt: act.prunedAt.toISOString(),
      status: act.status,
      restoredAt: act.restoredAt ? act.restoredAt.toISOString() : null
    }));

    return {
      items: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }
}

export const branchService = new BranchService();
