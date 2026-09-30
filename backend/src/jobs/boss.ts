import PgBoss from 'pg-boss';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { executeScanRepositoriesJob } from './scan-repositories.job.js';
import { executeSendWarningsJob } from './send-warnings.job.js';
import { executeAutoPruneJob } from './auto-prune.job.js';
import { executeSyncIntegrationsJob } from './sync-integrations.job.js';

let boss: PgBoss | null = null;

export async function initJobs(): Promise<PgBoss | null> {
  if (env.NODE_ENV === 'test') {
    logger.info('[Jobs] Skipping pg-boss scheduler in test environment');
    return null;
  }

  try {
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      archiveFailedAfterSeconds: 3600
    });

    boss.on('error', (error) => {
      logger.error({ error }, '[pg-boss] Error in background job manager');
    });

    await boss.start();
    logger.info('🚀 pg-boss job scheduler started');

    const queues = ['scan-repositories', 'send-warnings', 'auto-prune', 'sync-integrations'];
    for (const q of queues) {
      await boss.createQueue(q);
    }

    // Register Workers
    await boss.work('scan-repositories', async () => {
      await executeScanRepositoriesJob();
    });

    await boss.work('send-warnings', async () => {
      await executeSendWarningsJob();
    });

    await boss.work('auto-prune', async () => {
      await executeAutoPruneJob();
    });

    await boss.work('sync-integrations', async () => {
      await executeSyncIntegrationsJob();
    });

    // Register Cron Schedules
    await boss.schedule('scan-repositories', '0 * * * *', {}); // Hourly
    await boss.schedule('send-warnings', '*/15 * * * *', {}); // Every 15 min
    await boss.schedule('auto-prune', '0 * * * *', {}); // Hourly
    await boss.schedule('sync-integrations', '*/30 * * * *', {}); // Every 30 min

    logger.info('⏰ Registered background job schedules with pg-boss');
    return boss;
  } catch (err) {
    logger.warn({ err }, 'Failed to start pg-boss scheduler (database may not be ready yet)');
    return null;
  }
}

export async function stopJobs(): Promise<void> {
  if (boss) {
    await boss.stop();
    logger.info('🛑 pg-boss job scheduler stopped');
  }
}
