import { prisma } from '../config/database.js';
export class SettingsRepository {
    async findByWorkspaceId(workspaceId) {
        return prisma.settings.findUnique({
            where: { workspaceId }
        });
    }
    async upsert(workspaceId, data) {
        return prisma.settings.upsert({
            where: { workspaceId },
            update: data,
            create: {
                workspaceId,
                dryRun: data.dryRun !== undefined ? data.dryRun : true,
                staleAfterDays: data.staleAfterDays !== undefined ? data.staleAfterDays : 30,
                autoPrune: data.autoPrune !== undefined ? data.autoPrune : false,
                remediationWindowDays: 7
            }
        });
    }
}
export const settingsRepository = new SettingsRepository();
