import { prisma } from '../config/database.js';
export class SnapshotRepository {
    async listByWorkspace(workspaceId, options = {}) {
        const { repoId, page = 1, limit = 50 } = options;
        const where = {
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
    async findByIdInWorkspace(workspaceId, id) {
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
    async create(data) {
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
    async markRestored(id) {
        return prisma.snapshot.update({
            where: { id },
            data: {
                status: 'restored',
                restoredAt: new Date()
            }
        });
    }
    async countByWorkspace(workspaceId) {
        return prisma.snapshot.count({
            where: {
                repository: { workspaceId },
                status: 'archived'
            }
        });
    }
}
export const snapshotRepository = new SnapshotRepository();
