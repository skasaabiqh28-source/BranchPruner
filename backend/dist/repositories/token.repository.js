import { prisma } from '../config/database.js';
export class VerificationTokenRepository {
    async create(userId, tokenHash, expiresAt) {
        return prisma.verificationToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt
            }
        });
    }
    async findValid(tokenHash) {
        const token = await prisma.verificationToken.findUnique({
            where: { tokenHash }
        });
        if (!token || token.usedAt !== null || token.expiresAt < new Date()) {
            return null;
        }
        return token;
    }
    async markUsed(id) {
        return prisma.verificationToken.update({
            where: { id },
            data: { usedAt: new Date() }
        });
    }
    async invalidateAllForUser(userId) {
        await prisma.verificationToken.updateMany({
            where: { userId, usedAt: null },
            data: { usedAt: new Date() }
        });
    }
}
export class PasswordResetTokenRepository {
    async create(userId, tokenHash, expiresAt) {
        return prisma.passwordResetToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt
            }
        });
    }
    async findValid(tokenHash) {
        const token = await prisma.passwordResetToken.findUnique({
            where: { tokenHash }
        });
        if (!token || token.usedAt !== null || token.expiresAt < new Date()) {
            return null;
        }
        return token;
    }
    async markUsed(id) {
        return prisma.passwordResetToken.update({
            where: { id },
            data: { usedAt: new Date() }
        });
    }
    async invalidateAllForUser(userId) {
        await prisma.passwordResetToken.updateMany({
            where: { userId, usedAt: null },
            data: { usedAt: new Date() }
        });
    }
}
export const verificationTokenRepository = new VerificationTokenRepository();
export const passwordResetTokenRepository = new PasswordResetTokenRepository();
