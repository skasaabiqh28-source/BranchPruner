import { Router } from 'express';
import { repositoryController } from '../controllers/repository.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const repositoryRouter = Router();

repositoryRouter.get('/repositories', authMiddleware, (req, res, next) =>
  repositoryController.listRepositories(req, res, next)
);

repositoryRouter.post('/repositories/scan', authMiddleware, (req, res, next) =>
  repositoryController.scanRepository(req, res, next)
);
