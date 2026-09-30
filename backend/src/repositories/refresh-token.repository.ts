import { prisma } from '../config/database.js';
import { RefreshToken, Prisma } from '@prisma/client';

export class RefreshTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });
  }

  async findValidToken(userId: string | undefined, tokenHash: string): Promise<RefreshToken | null> {
    const where: Prisma.RefreshTokenWhereInput = {
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

  async revoke(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return result.count;
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
