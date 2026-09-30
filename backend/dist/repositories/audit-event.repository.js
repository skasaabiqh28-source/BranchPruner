import { prisma } from '../config/database.js';
export class AuditEventRepository {
    async create(data) {
        return prisma.auditEvent.create({
            data: {
                workspaceId: data.workspaceId,
                actorId: data.actorId,
                type: data.type,
                payload: data.payload,
                dryRun: data.dryRun
            }
        });
    }
    async listByWorkspace(workspaceId, limit = 100) {
        return prisma.auditEvent.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }
}
export const auditEventRepository = new AuditEventRepository();
