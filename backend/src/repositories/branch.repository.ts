import { prisma } from '../config/database.js';
import { Branch, Prisma } from '@prisma/client';

export interface BranchWithRepo extends Branch {
  repository: {
    id: string;
    fullName: string;
    defaultBranch: string;
  };
}

export class BranchRepository {
  async findById(id: string): Promise<BranchWithRepo | null> {
    return prisma.branch.findUnique({
      where: { id },
      include: {
        repository: {
          select: { id: true, fullName: true, defaultBranch: true }
        }
      }
    });
  }

  async findInWorkspace(workspaceId: string, id: string): Promise<BranchWithRepo | null> {
    return prisma.branch.findFirst({
      where: {
        id,
        repository: {
          workspaceId
        }
      },
      include: {
        repository: {
          select: { id: true, fullName: true, defaultBranch: true }
        }
      }
    });
  }

  async listFlaggedByWorkspace(
    workspaceId: string,
    options: {
      repoId?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'timeLeft' | 'staleness' | 'branchName';
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ items: BranchWithRepo[]; total: number }> {
    const { repoId, search, page = 1, limit = 50, sortBy = 'timeLeft', order = 'asc' } = options;

    const where: Prisma.BranchWhereInput = {
      status: 'flagged',
      repository: {
        workspaceId,
        ...(repoId && repoId !== 'all' ? { id: repoId } : {})
      },
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { author: { contains: search.trim(), mode: 'insensitive' } }
            ]
          }
        : {})
    };

    // Determine sorting
    let orderBy: Prisma.BranchOrderByWithRelationInput = { deadlineAt: 'asc' };
    if (sortBy === 'staleness') {
      // higher staleness = older lastCommitAt
      orderBy = { lastCommitAt: order === 'desc' ? 'asc' : 'desc' };
    } else if (sortBy === 'branchName') {
      orderBy = { name: order };
    } else if (sortBy === 'timeLeft') {
      orderBy = { deadlineAt: order };
    }

    const [total, items] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.findMany({
        where,
        include: {
          repository: {
            select: { id: true, fullName: true, defaultBranch: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    return { items, total };
  }

  async updateStatus(
    id: string,
    status: string,
    extraData: Partial<Pick<Branch, 'flaggedAt' | 'deadlineAt' | 'keptUntil' | 'warnedAt'>> = {}
  ): Promise<Branch> {
    return prisma.branch.update({
      where: { id },
      data: {
        status,
        ...extraData
      }
    });
  }

  async upsertBranch(
    repositoryId: string,
    data: {
      name: string;
      author: string;
      lastCommitSha: string;
      lastCommitAt: Date;
      status?: string;
      flaggedAt?: Date | null;
      deadlineAt?: Date | null;
    }
  ): Promise<Branch> {
    return prisma.branch.upsert({
      where: {
        repositoryId_name: {
          repositoryId,
          name: data.name
        }
      },
      update: {
        author: data.author,
        lastCommitSha: data.lastCommitSha,
        lastCommitAt: data.lastCommitAt,
        ...(data.status ? { status: data.status } : {}),
        ...(data.flaggedAt !== undefined ? { flaggedAt: data.flaggedAt } : {}),
        ...(data.deadlineAt !== undefined ? { deadlineAt: data.deadlineAt } : {})
      },
      create: {
        repositoryId,
        name: data.name,
        author: data.author,
        lastCommitSha: data.lastCommitSha,
        lastCommitAt: data.lastCommitAt,
        status: data.status || 'active',
        flaggedAt: data.flaggedAt,
        deadlineAt: data.deadlineAt
      }
    });
  }

  async markAsProtectedByNames(workspaceId: string, branchIds: string[]): Promise<number> {
    if (branchIds.length === 0) return 0;
    const result = await prisma.branch.updateMany({
      where: {
        id: { in: branchIds },
        repository: { workspaceId }
      },
      data: {
        status: 'protected'
      }
    });
    return result.count;
  }

  async findFlaggedOrActiveInWorkspace(workspaceId: string): Promise<BranchWithRepo[]> {
    return prisma.branch.findMany({
      where: {
        repository: { workspaceId }
      },
      include: {
        repository: {
          select: { id: true, fullName: true, defaultBranch: true }
        }
      }
    });
  }

  async countByStatus(workspaceId: string, status: string): Promise<number> {
    return prisma.branch.count({
      where: {
        status,
        repository: { workspaceId }
      }
    });
  }
}

export const branchRepository = new BranchRepository();
