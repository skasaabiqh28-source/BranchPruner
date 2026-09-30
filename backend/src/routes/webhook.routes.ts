import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();

webhookRouter.post('/webhooks/github', (req, res, next) =>
  webhookController.handleGitHubWebhook(req, res, next)
);
