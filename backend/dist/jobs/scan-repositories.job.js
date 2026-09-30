import { prisma } from '../config/database.js';
import { getGitProvider } from '../providers/git/index.js';
import { rulesService } from '../services/rules.service.js';
import { logger } from '../config/logger.js';
export async function executeScanRepositoriesJob() {
    logger.info('[Job:scan-repositories] Starting repository hygiene scan...');
    const workspaces = await prisma.workspace.findMany({
        include: { settings: true, repositories: true }
    });
    const now = Date.now();
    for (const ws of workspaces) {
        const staleAfterDays = ws.settings?.staleAfterDays ?? 30;
        const staleThresholdMs = staleAfterDays * 86400000;
        for (const repo of ws.repositories) {
            const provider = getGitProvider(repo.provider);
            try {
                const remoteBranches = await provider.listBranches(repo.fullName);
                for (const rb of remoteBranches) {
                    // Check if default branch
                    if (rb.name === repo.defaultBranch) {
                        continue;
                    }
                    // Check if protected by guardrail pattern
                    const isProtected = await rulesService.matchesAnyPattern(ws.id, rb.name);
                    const lastCommitTime = rb.commitDate.getTime();
                    const idleMs = now - lastCommitTime;
                    const isStale = idleMs >= staleThresholdMs;
                    const existingBranch = await prisma.branch.findUnique({
                        where: {
                            repositoryId_name: {
                                repositoryId: repo.id,
                                name: rb.name
                            }
                        }
                    });
                    if (!existingBranch) {
                        // New branch discovered
                        if (isProtected) {
                            await prisma.branch.create({
                                data: {
                                    repositoryId: repo.id,
                                    name: rb.name,
                                    author: rb.author,
                                    lastCommitSha: rb.commitSha,
                                    lastCommitAt: rb.commitDate,
                                    status: 'protected'
                                }
                            });
                        }
                        else if (isStale) {
                            const flaggedAt = new Date(now);
                            const deadlineAt = new Date(now + 7 * 86400000);
                            await prisma.branch.create({
                                data: {
                                    repositoryId: repo.id,
                                    name: rb.name,
                                    author: rb.author,
                                    lastCommitSha: rb.commitSha,
                                    lastCommitAt: rb.commitDate,
                                    status: 'flagged',
                                    flaggedAt,
                                    deadlineAt
                                }
                            });
                            logger.info({ repo: repo.fullName, branch: rb.name }, '[Job:scan-repositories] Flagged new stale branch');
                        }
                        else {
                            await prisma.branch.create({
                                data: {
                                    repositoryId: repo.id,
                                    name: rb.name,
                                    author: rb.author,
                                    lastCommitSha: rb.commitSha,
                                    lastCommitAt: rb.commitDate,
                                    status: 'active'
                                }
                            });
                        }
                    }
                    else {
                        // Existing branch: check if new commits arrived
                        const hasNewCommits = rb.commitSha !== existingBranch.lastCommitSha;
                        if (hasNewCommits) {
                            // Unflag if new commits were made
                            await prisma.branch.update({
                                where: { id: existingBranch.id },
                                data: {
                                    lastCommitSha: rb.commitSha,
                                    lastCommitAt: rb.commitDate,
                                    status: isProtected ? 'protected' : isStale ? 'flagged' : 'active',
                                    flaggedAt: isStale && !isProtected ? new Date(now) : null,
                                    deadlineAt: isStale && !isProtected ? new Date(now + 7 * 86400000) : null,
                                    warnedAt: null
                                }
                            });
                            logger.info({ repo: repo.fullName, branch: rb.name }, '[Job:scan-repositories] Updated branch with new commits');
                        }
                        else if (!isProtected && isStale && existingBranch.status === 'active') {
                            // Active branch became stale
                            const flaggedAt = new Date(now);
                            const deadlineAt = new Date(now + 7 * 86400000);
                            await prisma.branch.update({
                                where: { id: existingBranch.id },
                                data: {
                                    status: 'flagged',
                                    flaggedAt,
                                    deadlineAt
                                }
                            });
                            logger.info({ repo: repo.fullName, branch: rb.name }, '[Job:scan-repositories] Flagged idle branch');
                        }
                    }
                }
            }
            catch (err) {
                logger.error({ err, repo: repo.fullName }, '[Job:scan-repositories] Failed scanning repository');
            }
        }
    }
    logger.info('[Job:scan-repositories] Completed repository hygiene scan');
}
