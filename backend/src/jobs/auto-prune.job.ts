import { prisma } from '../config/database.js';
import { branchService } from '../services/branch.service.js';
import { logger } from '../config/logger.js';

export async function executeAutoPruneJob(): Promise<void> {
  logger.info('[Job:auto-prune] Checking for expired branches eligible for auto-pruning...');

  const workspaces = await prisma.workspace.findMany({
    include: { settings: true }
  });

  const now = new Date();

  for (const ws of workspaces) {
    // ONLY when autoPrune=true AND dryRun=false
    if (!ws.settings?.autoPrune || ws.settings.dryRun) {
      continue;
    }

    // Find flagged branches in this workspace where deadline has passed
    const expiredBranches = await prisma.branch.findMany({
      where: {
        status: 'flagged',
        deadlineAt: {
          lte: now
        },
        repository: {
          workspaceId: ws.id
        }
      }
    });

    for (const b of expiredBranches) {
      try {
        await branchService.pruneBranch(
          ws.id,
          null, // Scheduler actor
          b.id,
          true
        );
        logger.info({ branch: b.name, workspace: ws.id }, '[Job:auto-prune] Successfully auto-pruned expired branch');
      } catch (err) {
        logger.error({ err, branch: b.name }, '[Job:auto-prune] Failed to auto-prune branch');
      }
    }
  }

  logger.info('[Job:auto-prune] Completed auto-prune sweep');
}
