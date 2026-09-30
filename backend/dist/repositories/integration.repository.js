import { prisma } from '../config/database.js';
export class IntegrationRepository {
    async listByWorkspace(workspaceId) {
        return prisma.integration.findMany({
            where: { workspaceId },
            orderBy: { provider: 'asc' }
        });
    }
    async findByProvider(workspaceId, provider) {
        return prisma.integration.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider
                }
            }
        });
    }
    async upsert(workspaceId, provider, data) {
        return prisma.integration.upsert({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider
                }
            },
            update: {
                status: data.status,
                connectedAs: data.connectedAs,
                encryptedToken: data.encryptedToken,
                config: data.config,
                lastSyncedAt: data.lastSyncedAt
            },
            create: {
                workspaceId,
                provider,
                status: data.status,
                connectedAs: data.connectedAs,
                encryptedToken: data.encryptedToken,
                config: data.config,
                lastSyncedAt: data.lastSyncedAt
            }
        });
    }
    async disconnect(workspaceId, provider) {
        return prisma.integration.update({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider
                }
            },
            data: {
                status: 'disconnected',
                connectedAs: null,
                encryptedToken: null,
                lastSyncedAt: null
            }
        });
    }
    async updateConfig(workspaceId, provider, config) {
        return prisma.integration.update({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider
                }
            },
            data: { config }
        });
    }
    async updateLastSynced(workspaceId, provider) {
        return prisma.integration.update({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider
                }
            },
            data: { lastSyncedAt: new Date() }
        });
    }
}
export const integrationRepository = new IntegrationRepository();
