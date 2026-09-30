import { integrationService } from '../services/integration.service.js';
export class IntegrationController {
    async list(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const list = await integrationService.listIntegrations(workspaceId);
            res.status(200).json(list);
        }
        catch (err) {
            next(err);
        }
    }
    async connect(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { provider } = req.params;
            const { token, username, repoFullName } = req.body || {};
            const result = await integrationService.connect(workspaceId, actorId, provider, {
                token,
                username,
                repoFullName
            });
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async disconnect(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { provider } = req.params;
            const result = await integrationService.disconnect(workspaceId, actorId, provider);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async getSlackChannels(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const channels = await integrationService.getSlackChannels(workspaceId);
            res.status(200).json({ channels });
        }
        catch (err) {
            next(err);
        }
    }
    async updateSlackChannel(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { channel } = req.body;
            const result = await integrationService.updateSlackChannel(workspaceId, actorId, channel);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async sendTestSlack(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const result = await integrationService.sendSlackTest(workspaceId);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
export const integrationController = new IntegrationController();
