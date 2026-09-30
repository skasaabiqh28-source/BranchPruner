import { branchService } from '../services/branch.service.js';
export class BranchController {
    async listPending(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const { search, repoId, sort, order, page, limit } = req.query;
            const result = await branchService.listPendingBranches(workspaceId, {
                search,
                repoId,
                sort,
                order,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 50
            });
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async notifySlack(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { id } = req.params;
            const result = await branchService.notifySlack(workspaceId, actorId, id);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async keep(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { id } = req.params;
            const result = await branchService.keepBranch(workspaceId, actorId, id);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async undoKeep(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { id } = req.params;
            const { undoToken } = req.body;
            const result = await branchService.undoKeepBranch(workspaceId, actorId, id, undoToken);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async prune(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const actorId = req.user.userId;
            const { id } = req.params;
            const { confirm } = req.body;
            const idempotencyKey = req.header('Idempotency-Key');
            const result = await branchService.pruneBranch(workspaceId, actorId, id, confirm === true, idempotencyKey);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
export const branchController = new BranchController();
