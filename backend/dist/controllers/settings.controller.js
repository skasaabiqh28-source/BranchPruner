import { settingsService } from '../services/settings.service.js';
export class SettingsController {
    async getSettings(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const settings = await settingsService.getSettings(workspaceId);
            res.status(200).json(settings);
        }
        catch (err) {
            next(err);
        }
    }
    async updateSettings(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { dryRun, staleAfterDays, autoPrune } = req.body;
            const result = await settingsService.updateSettings(workspaceId, actorId, {
                dryRun,
                staleAfterDays,
                autoPrune
            });
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
export const settingsController = new SettingsController();
