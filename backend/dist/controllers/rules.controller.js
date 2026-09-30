import { rulesService } from '../services/rules.service.js';
export class RulesController {
    async listProtectedBranches(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const patterns = await rulesService.listProtectedPatterns(workspaceId);
            res.status(200).json(patterns);
        }
        catch (err) {
            next(err);
        }
    }
    async addProtectedBranch(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { pattern } = req.body;
            const result = await rulesService.addProtectedPattern(workspaceId, actorId, pattern);
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async deleteProtectedBranch(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { id } = req.params;
            const result = await rulesService.deleteProtectedPattern(workspaceId, actorId, id);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
export const rulesController = new RulesController();
