import { prisma } from '../config/database.js';
export class ProtectedPatternRepository {
    async listByWorkspace(workspaceId) {
        return prisma.protectedPattern.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'asc' }
        });
    }
    async findByPattern(workspaceId, pattern) {
        return prisma.protectedPattern.findUnique({
            where: {
                workspaceId_pattern: {
                    workspaceId,
                    pattern
                }
            }
        });
    }
    async findById(workspaceId, id) {
        return prisma.protectedPattern.findFirst({
            where: { id, workspaceId }
        });
    }
    async create(workspaceId, pattern) {
        return prisma.protectedPattern.create({
            data: {
                workspaceId,
                pattern
            }
        });
    }
    async delete(_workspaceId, id) {
        return prisma.protectedPattern.delete({
            where: { id }
        });
    }
}
export const protectedPatternRepository = new ProtectedPatternRepository();
