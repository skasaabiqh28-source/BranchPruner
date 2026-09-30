import { prisma } from '../config/database.js';
import { AuditEvent, Prisma } from '@prisma/client';

export class AuditEventRepository {
  async create(data: {
    workspaceId: string;
    actorId?: string | null;
    type: string;
    payload: Prisma.InputJsonValue;
    dryRun: boolean;
  }): Promise<AuditEvent> {
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

  async listByWorkspace(workspaceId: string, limit = 100): Promise<AuditEvent[]> {
    return prisma.auditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

export const auditEventRepository = new AuditEventRepository();
