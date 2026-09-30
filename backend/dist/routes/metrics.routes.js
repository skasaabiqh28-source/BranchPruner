import { Router } from 'express';
import { metricsController } from '../controllers/metrics.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
export const metricsRouter = Router();
metricsRouter.get('/metrics', authMiddleware, (req, res, next) => metricsController.getMetrics(req, res, next));
