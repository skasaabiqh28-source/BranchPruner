import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { BranchService } from '../src/services/branch.service.js';
import { branchRepository } from '../src/repositories/branch.repository.js';
import { integrationRepository } from '../src/repositories/integration.repository.js';
import { settingsRepository } from '../src/repositories/settings.repository.js';
import { auditEventRepository } from '../src/repositories/audit-event.repository.js';
import { rulesService } from '../src/services/rules.service.js';
import * as slackModule from '../src/providers/slack/index.js';
import { env } from '../src/config/env.js';

describe('Branches Service (Pending Remediation, Keep, Undo & Urgency)', () => {
  let branchService: BranchService;

  beforeEach(() => {
    vi.clearAllMocks();
    branchService = new BranchService();
  });

  const now = Date.now();

  const mockBranchUrgent = {
    id: 'b-urgent',
    name: 'feat/urgent-fix',
    repositoryId: 'repo-1',
    author: 'sarah.dev',
    lastCommitSha: 'sha1',
    lastCommitAt: new Date(now - 70 * 86400000),
    status: 'flagged',
    flaggedAt: new Date(now - 6 * 86400000),
    deadlineAt: new Date(now + 12 * 3600000), // 12 hours left -> < 48 hours is urgent!
    keptUntil: null,
    warnedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    repository: { id: 'repo-1', fullName: 'org/core-api', defaultBranch: 'main' }
  };

  const mockBranchNonUrgent = {
    id: 'b-non-urgent',
    name: 'feat/standard-refactor',
    repositoryId: 'repo-1',
    author: 'alex.tan',
    lastCommitSha: 'sha2',
    lastCommitAt: new Date(now - 40 * 86400000),
    status: 'flagged',
    flaggedAt: new Date(now - 2 * 86400000),
    deadlineAt: new Date(now + 120 * 3600000), // 120 hours left -> not urgent
    keptUntil: null,
    warnedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    repository: { id: 'repo-1', fullName: 'org/core-api', defaultBranch: 'main' }
  };

  describe('Pending Branches & 48-Hour Urgency Flag', () => {
    it('should correctly flag branches under 48 hours as isUrgent: true', async () => {
      vi.spyOn(branchRepository, 'listFlaggedByWorkspace').mockResolvedValueOnce({
        items: [mockBranchUrgent, mockBranchNonUrgent],
        total: 2
      });
      vi.spyOn(rulesService, 'matchesAnyPattern').mockResolvedValue(false);

      const result = await branchService.listPendingBranches('ws-1', {});

      expect(result.items).toHaveLength(2);
      const urgentItem = result.items.find((i) => i.id === 'b-urgent');
      const nonUrgentItem = result.items.find((i) => i.id === 'b-non-urgent');

      expect(urgentItem?.isUrgent).toBe(true);
      expect(nonUrgentItem?.isUrgent).toBe(false);
    });

    it('should never return branches matching a protected pattern', async () => {
      vi.spyOn(branchRepository, 'listFlaggedByWorkspace').mockResolvedValueOnce({
        items: [mockBranchUrgent, mockBranchNonUrgent],
        total: 2
      });
      // Mock that mockBranchUrgent matches a protected pattern
      vi.spyOn(rulesService, 'matchesAnyPattern').mockImplementation(async (_ws, name) => {
        return name === 'feat/urgent-fix';
      });

      const result = await branchService.listPendingBranches('ws-1', {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('b-non-urgent');
    });
  });

  describe('Slack Notification Alerts', () => {
    it('returns 409 SLACK_NOT_CONNECTED if Slack integration is disconnected', async () => {
      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce(mockBranchUrgent);
      vi.spyOn(integrationRepository, 'findByProvider').mockResolvedValueOnce({
        id: 'int-1',
        workspaceId: 'ws-1',
        provider: 'slack',
        status: 'disconnected', // Disconnected!
        connectedAs: null,
        encryptedToken: null,
        config: null,
        lastSyncedAt: null
      });

      await expect(
        branchService.notifySlack('ws-1', 'user-1', 'b-urgent')
      ).rejects.toMatchObject({
        status: 409,
        code: 'SLACK_NOT_CONNECTED'
      });
    });

    it('dispatches alert to Slack when connected and updates warnedAt', async () => {
      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce(mockBranchUrgent);
      vi.spyOn(integrationRepository, 'findByProvider').mockResolvedValueOnce({
        id: 'int-1',
        workspaceId: 'ws-1',
        provider: 'slack',
        status: 'connected',
        connectedAs: '@devops-notify',
        encryptedToken: 'enc',
        config: { channel: '#git-hygiene' },
        lastSyncedAt: new Date()
      });

      const mockNotifier = {
        sendWarning: vi.fn().mockResolvedValue(true),
        listChannels: vi.fn(),
        sendTestAlert: vi.fn()
      };
      vi.spyOn(slackModule, 'getSlackNotifier').mockReturnValue(mockNotifier as any);
      const updateStatusSpy = vi.spyOn(branchRepository, 'updateStatus').mockResolvedValueOnce({} as any);
      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce(null);
      vi.spyOn(auditEventRepository, 'create').mockResolvedValueOnce({} as any);

      const result = await branchService.notifySlack('ws-1', 'user-1', 'b-urgent');

      expect(result.success).toBe(true);
      expect(mockNotifier.sendWarning).toHaveBeenCalledWith('#git-hygiene', expect.objectContaining({
        branchName: 'feat/urgent-fix',
        author: 'sarah.dev'
      }));
      expect(updateStatusSpy).toHaveBeenCalledWith('b-urgent', 'flagged', expect.objectContaining({
        warnedAt: expect.any(Date)
      }));
    });
  });

  describe('Keep & Undo-Keep Token Lifecycles', () => {
    it('keepBranch returns signed undoToken and sets status=kept', async () => {
      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce(mockBranchUrgent);
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
      const updateSpy = vi.spyOn(branchRepository, 'updateStatus').mockResolvedValueOnce({} as any);
      vi.spyOn(auditEventRepository, 'create').mockResolvedValueOnce({} as any);

      const result = await branchService.keepBranch('ws-1', 'user-1', 'b-urgent');

      expect(result.undoToken).toBeDefined();
      expect(result.undoExpiresAt).toBeDefined();
      expect(updateSpy).toHaveBeenCalledWith('b-urgent', 'kept', expect.objectContaining({
        keptUntil: expect.any(Date)
      }));
    });

    it('undoKeep restores flagged status when valid token is supplied within 10s', async () => {
      const validToken = jwt.sign(
        {
          action: 'undo-keep',
          branchId: 'b-urgent',
          workspaceId: 'ws-1',
          previousFlaggedAt: mockBranchUrgent.flaggedAt.toISOString(),
          previousDeadlineAt: mockBranchUrgent.deadlineAt.toISOString()
        },
        env.JWT_SECRET,
        { expiresIn: '10s' }
      );

      vi.spyOn(branchRepository, 'findInWorkspace').mockResolvedValueOnce({
        ...mockBranchUrgent,
        status: 'kept'
      });
      const updateSpy = vi.spyOn(branchRepository, 'updateStatus').mockResolvedValueOnce({} as any);
      vi.spyOn(settingsRepository, 'findByWorkspaceId').mockResolvedValueOnce(null);
      vi.spyOn(auditEventRepository, 'create').mockResolvedValueOnce({} as any);

      const result = await branchService.undoKeepBranch('ws-1', 'user-1', 'b-urgent', validToken);

      expect(result.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith('b-urgent', 'flagged', expect.objectContaining({
        keptUntil: null
      }));
    });

    it('undoKeep throws 410 TOKEN_EXPIRED when token has expired past 10 seconds', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        {
          action: 'undo-keep',
          branchId: 'b-urgent',
          workspaceId: 'ws-1'
        },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      await expect(
        branchService.undoKeepBranch('ws-1', 'user-1', 'b-urgent', expiredToken)
      ).rejects.toMatchObject({
        status: 410,
        code: 'TOKEN_EXPIRED'
      });
    });
  });
});
