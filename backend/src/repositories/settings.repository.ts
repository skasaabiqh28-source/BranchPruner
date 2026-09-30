import { prisma } from '../config/database.js';
import { Settings, Prisma } from '@prisma/client';

export class SettingsRepository {
  async findByWorkspaceId(workspaceId: string): Promise<Settings | null> {
    return prisma.settings.findUnique({
      where: { workspaceId }
    });
  }

  async upsert(workspaceId: string, data: Prisma.SettingsUpdateInput): Promise<Settings> {
    return prisma.settings.upsert({
      where: { workspaceId },
      update: data,
      create: {
        workspaceId,
        dryRun: data.dryRun !== undefined ? (data.dryRun as boolean) : true,
        staleAfterDays: data.staleAfterDays !== undefined ? (data.staleAfterDays as number) : 30,
        autoPrune: data.autoPrune !== undefined ? (data.autoPrune as boolean) : false,
        remediationWindowDays: 7
      }
    });
  }
}

export const settingsRepository = new SettingsRepository();
