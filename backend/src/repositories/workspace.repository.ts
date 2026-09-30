import { prisma } from '../config/database.js';
import { Workspace } from '@prisma/client';

export class WorkspaceRepository {
  async findFirstForUser(userId: string): Promise<Workspace | null> {
    return prisma.workspace.findFirst({
      where: { ownerId: userId },
      include: { settings: true }
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({
      where: { id },
      include: { settings: true }
    });
  }

  async create(name: string, ownerId: string): Promise<Workspace> {
    return prisma.workspace.create({
      data: {
        name,
        ownerId,
        settings: {
          create: {
            dryRun: true,
            staleAfterDays: 30,
            autoPrune: false,
            remediationWindowDays: 7
          }
        }
      },
      include: { settings: true }
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
