import { Router } from 'express';
import { z } from 'zod';
import { settingsController } from '../controllers/settings.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

export const settingsRouter = Router();

const updateSettingsSchema = z.object({
  dryRun: z.boolean().optional(),
  staleAfterDays: z.number().int().min(14).max(180).optional(),
  autoPrune: z.boolean().optional()
});

settingsRouter.get('/settings', authMiddleware, (req, res, next) =>
  settingsController.getSettings(req, res, next)
);

settingsRouter.patch(
  '/settings',
  authMiddleware,
  validate({ body: updateSettingsSchema }),
  (req, res, next) => settingsController.updateSettings(req, res, next)
);
