import { Router } from 'express';
import { z } from 'zod';
import { branchController } from '../controllers/branch.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { destructiveActionRateLimiter } from '../middlewares/rate-limit.middleware.js';
export const branchRouter = Router();
const undoKeepSchema = z.object({
    undoToken: z.string().min(1, 'undoToken is required')
});
const pruneSchema = z.object({
    confirm: z.boolean({ required_error: 'confirm must be a boolean' })
});
branchRouter.get('/pending-branches', authMiddleware, (req, res, next) => branchController.listPending(req, res, next));
branchRouter.post('/pending-branches/:id/notify-slack', authMiddleware, (req, res, next) => branchController.notifySlack(req, res, next));
branchRouter.post('/pending-branches/:id/keep', authMiddleware, (req, res, next) => branchController.keep(req, res, next));
branchRouter.post('/pending-branches/:id/undo-keep', authMiddleware, validate({ body: undoKeepSchema }), (req, res, next) => branchController.undoKeep(req, res, next));
branchRouter.post('/pending-branches/:id/prune', authMiddleware, destructiveActionRateLimiter, validate({ body: pruneSchema }), (req, res, next) => branchController.prune(req, res, next));
