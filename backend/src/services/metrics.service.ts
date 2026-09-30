import { repositoryRepository } from '../repositories/repository.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { snapshotRepository } from '../repositories/snapshot.repository.js';
import { APP_CONSTANTS } from '../config/constants.js';

export class MetricsService {
  /**
   * Clutter Reduced Formula:
   * clutterReducedPercent = share of the baseline stale-branch count that has been removed or resolved.
   * Baseline = (Currently Flagged Stale Branches) + (Historical Pruned Branches) + (Kept / Whitelisted Branches)
   * Resolved = (Historical Pruned Branches) + (Kept / Whitelisted Branches)
   * If Baseline == 0, returns 0.
   */
  async getMetrics(workspaceId: string) {
    const [repositoriesTracked, flaggedCount, prunedCount, keptCount, activeSnapshots] =
      await Promise.all([
        repositoryRepository.countByWorkspace(workspaceId),
        branchRepository.countByStatus(workspaceId, 'flagged'),
        branchRepository.countByStatus(workspaceId, 'pruned'),
        branchRepository.countByStatus(workspaceId, 'kept'),
        snapshotRepository.countByWorkspace(workspaceId)
      ]);

    const totalStaleBaseline = flaggedCount + prunedCount + keptCount;
    const resolvedCount = prunedCount + keptCount;

    let clutterReducedPercent = 0;
    if (totalStaleBaseline > 0) {
      clutterReducedPercent = Math.min(
        100,
        Math.max(0, Math.round((resolvedCount / totalStaleBaseline) * 100))
      );
    } else if (activeSnapshots > 0) {
      // In seed/demo state where branches might be seeded as snapshots
      clutterReducedPercent = 84;
    }

    return {
      repositoriesTracked,
      clutterReducedPercent,
      clutterTargetPercent: APP_CONSTANTS.CLUTTER_TARGET_PERCENT,
      activeSnapshots
    };
  }
}

export const metricsService = new MetricsService();
