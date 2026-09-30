import { prisma } from '../config/database.js';
import { VerificationToken, PasswordResetToken } from '@prisma/client';

export class VerificationTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<VerificationToken> {
    return prisma.verificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });
  }

  async findValid(tokenHash: string): Promise<VerificationToken | null> {
    const token = await prisma.verificationToken.findUnique({
      where: { tokenHash }
    });

    if (!token || token.usedAt !== null || token.expiresAt < new Date()) {
      return null;
    }

    return token;
  }

  async markUsed(id: string): Promise<VerificationToken> {
    return prisma.verificationToken.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await prisma.verificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });
  }
}

export class PasswordResetTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });
  }

  async findValid(tokenHash: string): Promise<PasswordResetToken | null> {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!token || token.usedAt !== null || token.expiresAt < new Date()) {
      return null;
    }

    return token;
  }

  async markUsed(id: string): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });
  }
}

export const verificationTokenRepository = new VerificationTokenRepository();
export const passwordResetTokenRepository = new PasswordResetTokenRepository();
