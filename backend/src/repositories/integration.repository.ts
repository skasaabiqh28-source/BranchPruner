import { prisma } from '../config/database.js';
import { Integration, Prisma } from '@prisma/client';

export class IntegrationRepository {
  async listByWorkspace(workspaceId: string): Promise<Integration[]> {
    return prisma.integration.findMany({
      where: { workspaceId },
      orderBy: { provider: 'asc' }
    });
  }

  async findByProvider(workspaceId: string, provider: string): Promise<Integration | null> {
    return prisma.integration.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider
        }
      }
    });
  }

  async upsert(
    workspaceId: string,
    provider: string,
    data: {
      status: string;
      connectedAs?: string | null;
      encryptedToken?: string | null;
      config?: Prisma.InputJsonValue;
      lastSyncedAt?: Date | null;
    }
  ): Promise<Integration> {
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

  async disconnect(workspaceId: string, provider: string): Promise<Integration> {
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

  async updateConfig(workspaceId: string, provider: string, config: Prisma.InputJsonValue): Promise<Integration> {
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

  async updateLastSynced(workspaceId: string, provider: string): Promise<Integration> {
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
