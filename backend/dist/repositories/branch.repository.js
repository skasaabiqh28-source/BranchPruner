import { prisma } from '../config/database.js';
export class BranchRepository {
    async findById(id) {
        return prisma.branch.findUnique({
            where: { id },
            include: {
                repository: {
                    select: { id: true, fullName: true, defaultBranch: true }
                }
            }
        });
    }
    async findInWorkspace(workspaceId, id) {
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
    async listFlaggedByWorkspace(workspaceId, options = {}) {
        const { repoId, search, page = 1, limit = 50, sortBy = 'timeLeft', order = 'asc' } = options;
        const where = {
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
        let orderBy = { deadlineAt: 'asc' };
        if (sortBy === 'staleness') {
            // higher staleness = older lastCommitAt
            orderBy = { lastCommitAt: order === 'desc' ? 'asc' : 'desc' };
        }
        else if (sortBy === 'branchName') {
            orderBy = { name: order };
        }
        else if (sortBy === 'timeLeft') {
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
    async updateStatus(id, status, extraData = {}) {
        return prisma.branch.update({
            where: { id },
            data: {
                status,
                ...extraData
            }
        });
    }
    async upsertBranch(repositoryId, data) {
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
    async markAsProtectedByNames(workspaceId, branchIds) {
        if (branchIds.length === 0)
            return 0;
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
    async findFlaggedOrActiveInWorkspace(workspaceId) {
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
    async countByStatus(workspaceId, status) {
        return prisma.branch.count({
            where: {
                status,
                repository: { workspaceId }
            }
        });
    }
}
export const branchRepository = new BranchRepository();
