import { prisma } from '../config/database.js';
export class OAuthAccountRepository {
    async findByProvider(provider, providerUserId) {
        return prisma.oAuthAccount.findUnique({
            where: {
                provider_providerUserId: {
                    provider,
                    providerUserId
                }
            }
        });
    }
    async findByUserId(userId) {
        return prisma.oAuthAccount.findMany({
            where: { userId }
        });
    }
    async create(data) {
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
