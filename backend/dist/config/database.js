import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
export const prisma = global.__prisma ||
    new PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' }
        ]
    });
if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}
// Log queries in debug mode if needed
prisma.$on('error', (e) => {
    logger.error({ error: e }, 'Prisma error');
});
