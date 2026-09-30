import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
export async function executeSyncIntegrationsJob() {
    logger.info('[Job:sync-integrations] Refreshing lastSyncedAt for connected integrations...');
    await prisma.integration.updateMany({
        where: { status: 'connected' },
        data: { lastSyncedAt: new Date() }
    });
    logger.info('[Job:sync-integrations] Completed integration sync');
}
