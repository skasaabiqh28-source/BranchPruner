import { prisma } from '../config/database.js';
export class RefreshTokenRepository {
    async create(userId, tokenHash, expiresAt) {
        return prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt
            }
        });
    }
    async findValidToken(userId, tokenHash) {
        const where = {
            tokenHash,
            revokedAt: null,
            expiresAt: {
                gt: new Date()
            },
            ...(userId ? { userId } : {})
        };
        return prisma.refreshToken.findFirst({
            where
        });
    }
    async revoke(id) {
        return prisma.refreshToken.update({
            where: { id },
            data: { revokedAt: new Date() }
        });
    }
    async revokeAllForUser(userId) {
        const result = await prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() }
        });
        return result.count;
    }
}
export const refreshTokenRepository = new RefreshTokenRepository();
