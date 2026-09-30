import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { destructiveActionRateLimiter } from '../middlewares/rate-limit.middleware.js';
export const activityRouter = Router();
activityRouter.get('/activity', authMiddleware, (req, res, next) => activityController.listActivity(req, res, next));
activityRouter.post('/activity/:id/restore', authMiddleware, destructiveActionRateLimiter, (req, res, next) => activityController.restore(req, res, next));
