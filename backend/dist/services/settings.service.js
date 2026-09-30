import { settingsRepository } from '../repositories/settings.repository.js';
import { auditEventRepository } from '../repositories/audit-event.repository.js';
import { APP_CONSTANTS, ERROR_CODES } from '../config/constants.js';
export class SettingsService {
    async getSettings(workspaceId) {
        let settings = await settingsRepository.findByWorkspaceId(workspaceId);
        if (!settings) {
            settings = await settingsRepository.upsert(workspaceId, {
                dryRun: true,
                staleAfterDays: APP_CONSTANTS.STALE_AFTER_DAYS_DEFAULT,
                autoPrune: false
            });
        }
        return {
            dryRun: settings.dryRun,
            staleAfterDays: settings.staleAfterDays,
            autoPrune: settings.autoPrune,
            remediationWindowDays: settings.remediationWindowDays
        };
    }
    async updateSettings(workspaceId, actorId, data) {
        if (data.staleAfterDays !== undefined) {
            if (data.staleAfterDays < APP_CONSTANTS.STALE_AFTER_DAYS_MIN ||
                data.staleAfterDays > APP_CONSTANTS.STALE_AFTER_DAYS_MAX) {
                const err = new Error(`staleAfterDays must be between ${APP_CONSTANTS.STALE_AFTER_DAYS_MIN} and ${APP_CONSTANTS.STALE_AFTER_DAYS_MAX}`);
                err.code = ERROR_CODES.VALIDATION_ERROR;
                err.status = 400;
                throw err;
            }
        }
        const previous = await this.getSettings(workspaceId);
        const updated = await settingsRepository.upsert(workspaceId, {
            ...(data.dryRun !== undefined ? { dryRun: data.dryRun } : {}),
            ...(data.staleAfterDays !== undefined ? { staleAfterDays: data.staleAfterDays } : {}),
            ...(data.autoPrune !== undefined ? { autoPrune: data.autoPrune } : {})
        });
        // Write audit event
        await auditEventRepository.create({
            workspaceId,
            actorId,
            type: 'SETTINGS_CHANGE',
            payload: {
                previous,
                updated: {
                    dryRun: updated.dryRun,
                    staleAfterDays: updated.staleAfterDays,
                    autoPrune: updated.autoPrune
                }
            },
            dryRun: updated.dryRun
        });
        return {
            dryRun: updated.dryRun,
            staleAfterDays: updated.staleAfterDays,
            autoPrune: updated.autoPrune,
            remediationWindowDays: updated.remediationWindowDays
        };
    }
}
export const settingsService = new SettingsService();
