import { branchService } from '../services/branch.service.js';
export class ActivityController {
    async listActivity(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const { repoId, page, limit } = req.query;
            const result = await branchService.listActivity(workspaceId, {
                repoId,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 50
            });
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async restore(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { id } = req.params;
            const result = await branchService.restoreBranch(workspaceId, actorId, id);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
export const activityController = new ActivityController();
