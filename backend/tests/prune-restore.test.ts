import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BranchService } from '../src/services/branch.service.js';
import { branchRepository } from '../src/repositories/branch.repository.js';
import { snapshotRepository } from '../src/repositories/snapshot.repository.js';
import { settingsRepository } from '../src/repositories/settings.repository.js';
import { auditEventRepository } from '../src/repositories/audit-event.repository.js';
import { rulesService } from '../src/services/rules.service.js';
import * as gitProviderModule from '../src/providers/git/index.js';
import { GitProvider } from '../src/providers/git/git-provider.interface.js';
import { prisma } from '../src/config/database.js';

describe('Prune & Restore Flow (Safety, Rollback & Dry-Run Enforcement)', () => {
  let branchService: BranchService;

  beforeEach(() => {
    vi.clearAllMocks();
    branchService = new BranchService();
  });

  const mockBranch = {
    id: 'branch-123',
    name: 'feat/test-stale-branch',
    repositoryId: 'repo-123',
    author: 'sarah.dev',
    lastCommitSha: 'a1b2c3d4e5',
    lastCommitAt: new Date(Date.now() - 60 * 86400000),
    status: 'flagged',
    flaggedAt: new Date(Date.now() - 5 * 86400000),
    deadlineAt: new Date(Date.now() + 2 * 86400000),
    keptUntil: null,
    warnedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    repository: {
      id: 'repo-123',
      fullName: 'org/core-api',
      defaultBranch: 'main'
    }
  };

  describe('DRY-RUN Enforcement', () => {
    it('when dryRun is true, prune makes NO provider/DB modifications and returns simulation payload', async () => {
      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce(mockBranch);
      vi.spyOn(rulesService, 'matchesAnyPattern').mockResolvedValueOnce(false);
      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce({
        id: 's-1',
        workspaceId: 'ws-1',
        dryRun: true, // Dry run ON!
        staleAfterDays: 30,
        autoPrune: false,
        remediationWindowDays: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const auditSpy = vi.spyOn(auditEventRepository, 'create').mockResolvedValueOnce({} as any);
      const mockProvider: Partial<GitProvider> = {
        createArchiveRef: vi.fn(),
        deleteBranch: vi.fn()
      };
      vi.spyOn(gitProviderModule, 'getGitProvider').mockReturnValue(mockProvider as GitProvider);

      const result = await branchService.pruneBranch('ws-1', 'user-1', 'branch-123', true);

      expect(result).toEqual({
        dryRun: true,
        wouldDo: 'prune',
        target: {
          id: 'branch-123',
          branchName: 'feat/test-stale-branch',
          repo: 'org/core-api'
        }
      });

      // Provider was NOT called
      expect(mockProvider.createArchiveRef).not.toHaveBeenCalled();
      expect(mockProvider.deleteBranch).not.toHaveBeenCalled();

      // Audit event logged with dryRun=true
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRUNE_BRANCH',
          dryRun: true
        })
      );
    });

    it('when dryRun is true, restore makes NO provider/DB modifications and returns simulation payload', async () => {
      vi.spyOn(snapshotRepository, 'findByIdInWorkspace').mockResolvedValueOnce({
        id: 'snap-1',
        repositoryId: 'repo-123',
        branchName: 'feat/test-stale-branch',
        archivedCommitSha: 'a1b2c3d4e5',
        archiveRef: 'refs/branchpruner/archive/feat/test-stale-branch',
        prunedAt: new Date(),
        prunedBy: 'user',
        status: 'archived',
        restoredAt: null,
        repository: { id: 'repo-123', fullName: 'org/core-api' }
      });

      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce({
        id: 's-1',
        workspaceId: 'ws-1',
        dryRun: true,
        staleAfterDays: 30,
        autoPrune: false,
        remediationWindowDays: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const auditSpy = vi.spyOn(auditEventRepository, 'create').mockResolvedValueOnce({} as any);
      const mockProvider: Partial<GitProvider> = {
        createBranchFromSha: vi.fn()
      };
      vi.spyOn(gitProviderModule, 'getGitProvider').mockReturnValue(mockProvider as GitProvider);

      const result = await branchService.restoreBranch('ws-1', 'user-1', 'snap-1');

      expect(result).toEqual({
        dryRun: true,
        wouldDo: 'restore',
        target: {
          id: 'snap-1',
          branchName: 'feat/test-stale-branch',
          repo: 'org/core-api'
        }
      });

      expect(mockProvider.createBranchFromSha).not.toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESTORE_BRANCH',
          dryRun: true
        })
      );
    });
  });

  describe('Live Prune & Rollback', () => {
    it('creates archive ref BEFORE deleting branch, then records snapshot in DB transaction', async () => {
      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce(mockBranch);
      vi.spyOn(rulesService, 'matchesAnyPattern').mockResolvedValueOnce(false);
      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce({
        id: 's-1',
        workspaceId: 'ws-1',
        dryRun: false, // Live mode
        staleAfterDays: 30,
        autoPrune: false,
        remediationWindowDays: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const callOrder: string[] = [];
      const mockProvider: GitProvider = {
        listRepos: vi.fn(),
        listBranches: vi.fn(),
        getBranch: vi.fn(),
        createArchiveRef: vi.fn().mockImplementation(async () => {
          callOrder.push('createArchiveRef');
          return 'refs/branchpruner/archive/feat/test-stale-branch';
        }),
        deleteBranch: vi.fn().mockImplementation(async () => {
          callOrder.push('deleteBranch');
          return true;
        }),
        createBranchFromSha: vi.fn(),
        deleteArchiveRef: vi.fn()
      };
      vi.spyOn(gitProviderModule, 'getGitProvider').mockReturnValue(mockProvider);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        callOrder.push('dbTransaction');
        return callback({
          branch: { update: vi.fn().mockResolvedValue({ id: 'branch-123', name: 'feat/test-stale-branch' }) },
          snapshot: { create: vi.fn().mockResolvedValue({ id: 'snap-1', archivedCommitSha: 'a1b2c3d4e5' }) },
          auditEvent: { create: vi.fn().mockResolvedValue({}) }
        });
      });

      const result = await branchService.pruneBranch('ws-1', 'user-1', 'branch-123', true);

      expect(callOrder).toEqual(['createArchiveRef', 'deleteBranch', 'dbTransaction']);
      expect(result).toMatchObject({
        success: true,
        branchId: 'branch-123',
        archiveRef: 'refs/branchpruner/archive/feat/test-stale-branch'
      });
    });

    it('rolls back archive ref if remote branch deletion fails and throws provider error', async () => {
      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce(mockBranch);
      vi.spyOn(rulesService, 'matchesAnyPattern').mockResolvedValueOnce(false);
      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce({
        id: 's-1',
        workspaceId: 'ws-1',
        dryRun: false,
        staleAfterDays: 30,
        autoPrune: false,
        remediationWindowDays: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const mockProvider: GitProvider = {
        listRepos: vi.fn(),
        listBranches: vi.fn(),
        getBranch: vi.fn(),
        createArchiveRef: vi.fn().mockResolvedValue('refs/branchpruner/archive/feat/test-stale-branch'),
        deleteBranch: vi.fn().mockRejectedValue(new Error('Remote branch deletion rejected by GitLab 403')),
        createBranchFromSha: vi.fn(),
        deleteArchiveRef: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(gitProviderModule, 'getGitProvider').mockReturnValue(mockProvider);

      await expect(
        branchService.pruneBranch('ws-1', 'user-1', 'branch-123', true)
      ).rejects.toMatchObject({
        status: 502,
        code: 'PROVIDER_ERROR'
      });

      // Rollback was invoked
      expect(mockProvider.deleteArchiveRef).toHaveBeenCalledWith(
        'org/core-api',
        'refs/branchpruner/archive/feat/test-stale-branch'
      );
    });

    it('rejects restore with 409 BRANCH_EXISTS if branch already exists on remote', async () => {
      vi.spyOn(snapshotRepository, 'findByIdInWorkspace').mockResolvedValueOnce({
        id: 'snap-1',
        repositoryId: 'repo-123',
        branchName: 'feat/test-stale-branch',
        archivedCommitSha: 'a1b2c3d4e5',
        archiveRef: 'refs/branchpruner/archive/feat/test-stale-branch',
        prunedAt: new Date(),
        prunedBy: 'user',
        status: 'archived',
        restoredAt: null,
        repository: { id: 'repo-123', fullName: 'org/core-api' }
      });

      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce({
        id: 's-1',
        workspaceId: 'ws-1',
        dryRun: false,
        staleAfterDays: 30,
        autoPrune: false,
        remediationWindowDays: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const conflictErr = new Error("Branch 'feat/test-stale-branch' already exists on remote");
      (conflictErr as any).status = 409;

      const mockProvider: Partial<GitProvider> = {
        createBranchFromSha: vi.fn().mockRejectedValue(conflictErr)
      };
      vi.spyOn(gitProviderModule, 'getGitProvider').mockReturnValue(mockProvider as GitProvider);

      await expect(
        branchService.restoreBranch('ws-1', 'user-1', 'snap-1')
      ).rejects.toMatchObject({
        status: 409,
        code: 'BRANCH_EXISTS'
      });
    });
  });
});
