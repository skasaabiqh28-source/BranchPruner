import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/database.js';
import { initJobs, stopJobs } from './jobs/boss.js';
const app = createApp();
const server = app.listen(env.PORT, async () => {
    logger.info(`⚡ BranchPruner API listening on http://localhost:${env.PORT}`);
    logger.info(`📚 Swagger OpenAPI documentation available at http://localhost:${env.PORT}/docs`);
    // Start pg-boss background jobs
    try {
        await initJobs();
    }
    catch (err) {
        logger.warn({ err }, 'Could not initialize background jobs on startup');
    }
});
// Graceful shutdown handling
async function handleShutdown(signal) {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
        logger.info('HTTP server closed.');
        try {
            await stopJobs();
            await prisma.$disconnect();
            logger.info('Database and jobs gracefully disconnected.');
            process.exit(0);
        }
        catch (err) {
            logger.error({ err }, 'Error during graceful shutdown');
            process.exit(1);
        }
    });
    // Force shutdown if taking too long
    setTimeout(() => {
        logger.error('Shutdown timeout reached. Force exiting.');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
