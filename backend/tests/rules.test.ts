import { describe, it, expect, vi, beforeEach } from 'vitest';
import { minimatch } from 'minimatch';
import { RulesService } from '../src/services/rules.service.js';
import { protectedPatternRepository } from '../src/repositories/protected-pattern.repository.js';
import { branchRepository } from '../src/repositories/branch.repository.js';
import { auditEventRepository } from '../src/repositories/audit-event.repository.js';
import { settingsRepository } from '../src/repositories/settings.repository.js';

describe('Rules & Guardrails Service', () => {
  let rulesService: RulesService;

  beforeEach(() => {
    vi.clearAllMocks();
    rulesService = new RulesService();
  });

  describe('Wildcard Pattern Matching (Glob Guardrails)', () => {
    it('should correctly match wildcard patterns like release/* and hotfix/*', () => {
      expect(minimatch('release/v1.0.0', 'release/*')).toBe(true);
      expect(minimatch('release/2026.1', 'release/*')).toBe(true);
      expect(minimatch('feature/release-notes', 'release/*')).toBe(false);

      expect(minimatch('hotfix/cve-2026', 'hotfix/*')).toBe(true);
      expect(minimatch('fix/hotfix-patch', 'hotfix/*')).toBe(false);

      expect(minimatch('prod-v2.1', 'prod-v*')).toBe(true);
      expect(minimatch('staging-v2.1', 'prod-v*')).toBe(false);

      expect(minimatch('main', 'main')).toBe(true);
      expect(minimatch('master', 'master')).toBe(true);
      expect(minimatch('main-patch', 'main')).toBe(false);
    });

    it('should reject empty or whitespace-only patterns with 422', async () => {
      await expect(
        rulesService.addProtectedPattern('ws-1', 'user-1', '   ')
      ).rejects.toMatchObject({
        status: 422,
        code: 'VALIDATION_ERROR',
        details: { pattern: 'Pattern cannot be blank' }
      });
    });

    it('should reject patterns with invalid characters', async () => {
      await expect(
        rulesService.addProtectedPattern('ws-1', 'user-1', 'release/!@#$%^')
      ).rejects.toMatchObject({
        status: 422,
        code: 'VALIDATION_ERROR'
      });
    });

    it('should reject duplicate patterns with 422 and field error', async () => {
      vi.spyOn(protectedPatternRepository, 'findByPattern').mockResolvedValueOnce({
        id: 'pat-1',
        workspaceId: 'ws-1',
        pattern: 'release/*',
        createdAt: new Date()
      });

      await expect(
        rulesService.addProtectedPattern('ws-1', 'user-1', 'release/*')
      ).rejects.toMatchObject({
        status: 422,
        code: 'CONFLICT',
        details: { pattern: 'Pattern already exists in guardrails' }
      });
    });

    it('should prevent deletion of core preset guardrails (main, master)', async () => {
      vi.spyOn(protectedPatternRepository, 'findById').mockResolvedValueOnce({
        id: 'preset-1',
        workspaceId: 'ws-1',
        pattern: 'main',
        createdAt: new Date()
      });

      await expect(
        rulesService.deleteProtectedPattern('ws-1', 'user-1', 'preset-1')
      ).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Cannot delete root branch preset')
      });
    });

    it('should retroactively mark matching flagged branches as protected when pattern is added', async () => {
      vi.spyOn(protectedPatternRepository, 'findByPattern').mockResolvedValueOnce(null);
      vi.spyOn(protectedPatternRepository, 'create').mockResolvedValueOnce({
        id: 'pat-new',
        workspaceId: 'ws-1',
        pattern: 'hotfix/*',
        createdAt: new Date()
      });

      const mockBranches = [
        {
          id: 'b-1',
          name: 'hotfix/security-fix-1',
          status: 'flagged',
          repositoryId: 'repo-1',
          author: 'dev',
          lastCommitSha: 'sha1',
          lastCommitAt: new Date(),
          flaggedAt: new Date(),
          deadlineAt: new Date(),
          keptUntil: null,
          warnedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          repository: { id: 'repo-1', fullName: 'org/core-api', defaultBranch: 'main' }
        },
        {
          id: 'b-2',
          name: 'feature/checkout',
          status: 'flagged',
          repositoryId: 'repo-1',
          author: 'dev',
          lastCommitSha: 'sha2',
          lastCommitAt: new Date(),
          flaggedAt: new Date(),
          deadlineAt: new Date(),
          keptUntil: null,
          warnedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          repository: { id: 'repo-1', fullName: 'org/core-api', defaultBranch: 'main' }
        }
      ];

      vi.spyOn(branchRepository, 'findFlaggedOrActiveInWorkspace').mockResolvedValueOnce(mockBranches);
      const markProtectedSpy = vi.spyOn(branchRepository, 'markAsProtectedByNames').mockResolvedValueOnce(1);
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
      const auditSpy = vi.spyOn(auditEventRepository, 'create').mockResolvedValueOnce({} as any);

      const result = await rulesService.addProtectedPattern('ws-1', 'user-1', 'hotfix/*');

      expect(result.pattern).toBe('hotfix/*');
      expect(result.retroactivelyProtectedCount).toBe(1);
      expect(markProtectedSpy).toHaveBeenCalledWith('ws-1', ['b-1']);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PATTERN_ADD',
          payload: expect.objectContaining({ pattern: 'hotfix/*', retroactivelyProtectedCount: 1 })
        })
      );
    });
  });
});
