import { prisma } from '../config/database.js';
import { integrationRepository } from '../repositories/integration.repository.js';
import { getSlackNotifier } from '../providers/slack/index.js';
import { env } from '../config/env.js';
import { APP_CONSTANTS } from '../config/constants.js';
import { logger } from '../config/logger.js';

export async function executeSendWarningsJob(): Promise<void> {
  logger.info('[Job:send-warnings] Checking for urgent branches requiring Slack warnings...');

  const now = Date.now();
  const urgentThresholdMs = APP_CONSTANTS.URGENT_THRESHOLD_HOURS * 3600000;

  // Find all flagged branches without a warnedAt timestamp whose deadline is under 48h
  const flaggedBranches = await prisma.branch.findMany({
    where: {
      status: 'flagged',
      warnedAt: null,
      deadlineAt: {
        not: null,
        lte: new Date(now + urgentThresholdMs)
      }
    },
    include: {
      repository: {
        include: {
          workspace: true
        }
      }
    }
  });

  const notifier = getSlackNotifier();

  for (const b of flaggedBranches) {
    const workspaceId = b.repository.workspaceId;
    const slack = await integrationRepository.findByProvider(workspaceId, 'slack');

    if (!slack || slack.status !== 'connected') {
      continue;
    }

    const config = slack.config as { channel?: string } | null;
    const channel = config?.channel || env.SLACK_DEFAULT_CHANNEL;

    const daysStale = Math.max(0, Math.floor((now - b.lastCommitAt.getTime()) / 86400000));
    const deadlineAt = b.deadlineAt || new Date(now + urgentThresholdMs);
    const timeLeftHours = Math.max(0, Math.round((deadlineAt.getTime() - now) / 3600000));

    try {
      await notifier.sendWarning(channel, {
        branchName: b.name,
        repoFullName: b.repository.fullName,
        author: b.author,
        daysStale,
        timeLeftHours,
        deadlineAt
      });

      // Dedupe by saving warnedAt
      await prisma.branch.update({
        where: { id: b.id },
        data: { warnedAt: new Date() }
      });

      logger.info({ branch: b.name, channel }, '[Job:send-warnings] Dispatched 48h urgent warning');
    } catch (err) {
      logger.error({ err, branch: b.name }, '[Job:send-warnings] Failed sending warning');
    }
  }

  logger.info({ count: flaggedBranches.length }, '[Job:send-warnings] Completed warnings check');
}
