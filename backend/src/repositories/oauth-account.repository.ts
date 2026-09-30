import { prisma } from '../config/database.js';
import { OAuthAccount } from '@prisma/client';

export class OAuthAccountRepository {
  async findByProvider(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    return prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId
        }
      }
    });
  }

  async findByUserId(userId: string): Promise<OAuthAccount[]> {
    return prisma.oAuthAccount.findMany({
      where: { userId }
    });
  }

  async create(data: {
    userId: string;
    provider: string;
    providerUserId: string;
    email: string;
  }): Promise<OAuthAccount> {
    return prisma.oAuthAccount.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerUserId: data.providerUserId,
        email: data.email.toLowerCase()
      }
    });
  }
}

export const oauthAccountRepository = new OAuthAccountRepository();
