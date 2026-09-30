import { prisma } from '../config/database.js';
import { ProtectedPattern } from '@prisma/client';

export class ProtectedPatternRepository {
  async listByWorkspace(workspaceId: string): Promise<ProtectedPattern[]> {
    return prisma.protectedPattern.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findByPattern(workspaceId: string, pattern: string): Promise<ProtectedPattern | null> {
    return prisma.protectedPattern.findUnique({
      where: {
        workspaceId_pattern: {
          workspaceId,
          pattern
        }
      }
    });
  }

  async findById(workspaceId: string, id: string): Promise<ProtectedPattern | null> {
    return prisma.protectedPattern.findFirst({
      where: { id, workspaceId }
    });
  }

  async create(workspaceId: string, pattern: string): Promise<ProtectedPattern> {
    return prisma.protectedPattern.create({
      data: {
        workspaceId,
        pattern
      }
    });
  }

  async delete(_workspaceId: string, id: string): Promise<ProtectedPattern> {
    return prisma.protectedPattern.delete({
      where: { id }
    });
  }
}

export const protectedPatternRepository = new ProtectedPatternRepository();
