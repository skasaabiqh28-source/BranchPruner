import { minimatch } from 'minimatch';
import { protectedPatternRepository } from '../repositories/protected-pattern.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { auditEventRepository } from '../repositories/audit-event.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { ERROR_CODES } from '../config/constants.js';

export class RulesService {
  async listProtectedPatterns(workspaceId: string) {
    const patterns = await protectedPatternRepository.listByWorkspace(workspaceId);
    return patterns.map((p) => ({
      id: p.id,
      pattern: p.pattern,
      createdAt: p.createdAt,
      isPreset: p.pattern === 'main' || p.pattern === 'master'
    }));
  }

  async addProtectedPattern(workspaceId: string, actorId: string | null, rawPattern: string) {
    const pattern = rawPattern?.trim();

    if (!pattern) {
      const err = new Error('Pattern cannot be blank');
      (err as unknown as { code: string; status: number; details: Record<string, string> }).code =
        ERROR_CODES.VALIDATION_ERROR;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).status = 422;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).details = {
        pattern: 'Pattern cannot be blank'
      };
      throw err;
    }

    if (pattern.length > 100) {
      const err = new Error('Pattern must not exceed 100 characters');
      (err as unknown as { code: string; status: number; details: Record<string, string> }).code =
        ERROR_CODES.VALIDATION_ERROR;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).status = 422;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).details = {
        pattern: 'Pattern exceeds maximum length of 100 characters'
      };
      throw err;
    }

    const patternRegex = /^[a-zA-Z0-9_\-./*]+$/;
    if (!patternRegex.test(pattern)) {
      const err = new Error('Pattern contains invalid characters. Only alphanumeric, _, -, ., /, and * are allowed.');
      (err as unknown as { code: string; status: number; details: Record<string, string> }).code =
        ERROR_CODES.VALIDATION_ERROR;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).status = 422;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).details = {
        pattern: 'Pattern contains invalid characters'
      };
      throw err;
    }

    // Check duplicate
    const existing = await protectedPatternRepository.findByPattern(workspaceId, pattern);
    if (existing) {
      const err = new Error('Pattern already exists in guardrails');
      (err as unknown as { code: string; status: number; details: Record<string, string> }).code =
        ERROR_CODES.CONFLICT;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).status = 422;
      (err as unknown as { code: string; status: number; details: Record<string, string> }).details = {
        pattern: 'Pattern already exists in guardrails'
      };
      throw err;
    }

    const created = await protectedPatternRepository.create(workspaceId, pattern);

    // Retroactive protection: Immediately find all branches in workspace and mark matching flagged ones as protected
    const branches = await branchRepository.findFlaggedOrActiveInWorkspace(workspaceId);
    const matchingFlaggedBranchIds: string[] = [];

    for (const b of branches) {
      if (b.status === 'flagged' && minimatch(b.name, pattern)) {
        matchingFlaggedBranchIds.push(b.id);
      }
    }

    let retroactivelyProtectedCount = 0;
    if (matchingFlaggedBranchIds.length > 0) {
      retroactivelyProtectedCount = await branchRepository.markAsProtectedByNames(
        workspaceId,
        matchingFlaggedBranchIds
      );
    }

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    // Write audit event
    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'PATTERN_ADD',
      payload: {
        pattern,
        retroactivelyProtectedCount,
        matchingBranches: matchingFlaggedBranchIds
      },
      dryRun: settings?.dryRun ?? false
    });

    return {
      id: created.id,
      pattern: created.pattern,
      createdAt: created.createdAt,
      isPreset: false,
      retroactivelyProtectedCount
    };
  }

  async deleteProtectedPattern(workspaceId: string, actorId: string | null, id: string) {
    const pattern = await protectedPatternRepository.findById(workspaceId, id);
    if (!pattern) {
      const err = new Error('Protected pattern not found');
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.NOT_FOUND;
      (err as unknown as { code: string; status: number }).status = 404;
      throw err;
    }

    if (pattern.pattern === 'main' || pattern.pattern === 'master') {
      const err = new Error(`Cannot delete root branch preset guardrail: ${pattern.pattern}`);
      (err as unknown as { code: string; status: number }).code = ERROR_CODES.BAD_REQUEST;
      (err as unknown as { code: string; status: number }).status = 400;
      throw err;
    }

    await protectedPatternRepository.delete(workspaceId, id);

    const settings = await settingsRepository.findByWorkspaceId(workspaceId);

    await auditEventRepository.create({
      workspaceId,
      actorId,
      type: 'PATTERN_DELETE',
      payload: {
        deletedPattern: pattern.pattern
      },
      dryRun: settings?.dryRun ?? false
    });

    return { success: true, deletedPattern: pattern.pattern };
  }

  async matchesAnyPattern(workspaceId: string, branchName: string): Promise<boolean> {
    const patterns = await protectedPatternRepository.listByWorkspace(workspaceId);
    for (const p of patterns) {
      if (minimatch(branchName, p.pattern)) {
        return true;
      }
    }
    return false;
  }
}

export const rulesService = new RulesService();
