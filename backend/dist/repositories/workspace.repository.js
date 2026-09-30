import { prisma } from '../config/database.js';
export class WorkspaceRepository {
    async findFirstForUser(userId) {
        return prisma.workspace.findFirst({
            where: { ownerId: userId },
            include: { settings: true }
        });
    }
    async findById(id) {
        return prisma.workspace.findUnique({
            where: { id },
            include: { settings: true }
        });
    }
    async create(name, ownerId) {
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
