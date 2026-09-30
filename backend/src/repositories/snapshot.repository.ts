import { prisma } from '../config/database.js';
import { Snapshot, Prisma } from '@prisma/client';

export interface SnapshotWithRepo extends Snapshot {
  repository: {
    id: string;
    fullName: string;
  };
}

export class SnapshotRepository {
  async listByWorkspace(
    workspaceId: string,
    options: {
      repoId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ items: SnapshotWithRepo[]; total: number }> {
    const { repoId, page = 1, limit = 50 } = options;

    const where: Prisma.SnapshotWhereInput = {
      repository: {
        workspaceId,
        ...(repoId && repoId !== 'all' ? { id: repoId } : {})
      }
    };

    const [total, items] = await Promise.all([
      prisma.snapshot.count({ where }),
      prisma.snapshot.findMany({
        where,
        include: {
          repository: {
            select: { id: true, fullName: true }
          }
        },
        orderBy: { prunedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    return { items, total };
  }

  async findByIdInWorkspace(workspaceId: string, id: string): Promise<SnapshotWithRepo | null> {
    return prisma.snapshot.findFirst({
      where: {
        id,
        repository: { workspaceId }
      },
      include: {
        repository: {
          select: { id: true, fullName: true }
        }
      }
    });
  }

  async create(data: {
    repositoryId: string;
    branchName: string;
    archivedCommitSha: string;
    archiveRef: string;
    prunedBy?: string;
  }): Promise<Snapshot> {
    return prisma.snapshot.create({
      data: {
        repositoryId: data.repositoryId,
        branchName: data.branchName,
        archivedCommitSha: data.archivedCommitSha,
        archiveRef: data.archiveRef,
        prunedBy: data.prunedBy || 'user',
        status: 'archived'
      }
    });
  }

  async markRestored(id: string): Promise<Snapshot> {
    return prisma.snapshot.update({
      where: { id },
      data: {
        status: 'restored',
        restoredAt: new Date()
      }
    });
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return prisma.snapshot.count({
      where: {
        repository: { workspaceId },
        status: 'archived'
      }
    });
  }
}

export const snapshotRepository = new SnapshotRepository();
