import { prisma } from '../config/database.js';
import { Repository } from '@prisma/client';

export class RepositoryRepository {
  async listByWorkspace(workspaceId: string): Promise<Repository[]> {
    return prisma.repository.findMany({
      where: { workspaceId },
      orderBy: { fullName: 'asc' }
    });
  }

  async findById(workspaceId: string, id: string): Promise<Repository | null> {
    return prisma.repository.findFirst({
      where: { id, workspaceId }
    });
  }

  async findByFullName(workspaceId: string, fullName: string): Promise<Repository | null> {
    return prisma.repository.findFirst({
      where: { workspaceId, fullName }
    });
  }

  async upsert(workspaceId: string, data: { fullName: string; provider: string; defaultBranch: string; externalId?: string }): Promise<Repository> {
    return prisma.repository.upsert({
      where: {
        workspaceId_fullName: {
          workspaceId,
          fullName: data.fullName
        }
      },
      update: {
        defaultBranch: data.defaultBranch,
        externalId: data.externalId
      },
      create: {
        workspaceId,
        provider: data.provider,
        fullName: data.fullName,
        defaultBranch: data.defaultBranch,
        externalId: data.externalId
      }
    });
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return prisma.repository.count({
      where: { workspaceId }
    });
  }
}

export const repositoryRepository = new RepositoryRepository();
