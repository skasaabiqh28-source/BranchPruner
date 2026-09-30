import { Router } from 'express';
import { z } from 'zod';
import { rulesController } from '../controllers/rules.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

export const rulesRouter = Router();

const addPatternSchema = z.object({
  pattern: z.string({ required_error: 'pattern is required' })
});

rulesRouter.get('/rules/protected-branches', authMiddleware, (req, res, next) =>
  rulesController.listProtectedBranches(req, res, next)
);

rulesRouter.post(
  '/rules/protected-branches',
  authMiddleware,
  validate({ body: addPatternSchema }),
  (req, res, next) => rulesController.addProtectedBranch(req, res, next)
);

rulesRouter.delete('/rules/protected-branches/:id', authMiddleware, (req, res, next) =>
  rulesController.deleteProtectedBranch(req, res, next)
);
