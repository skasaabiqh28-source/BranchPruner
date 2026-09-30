import { Router } from 'express';
import { z } from 'zod';
import { integrationController } from '../controllers/integration.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
export const integrationRouter = Router();
const slackChannelSchema = z.object({
    channel: z.string().min(1, 'channel is required')
});
integrationRouter.get('/integrations', authMiddleware, (req, res, next) => integrationController.list(req, res, next));
integrationRouter.post('/integrations/:provider/connect', authMiddleware, (req, res, next) => integrationController.connect(req, res, next));
integrationRouter.delete('/integrations/:provider', authMiddleware, (req, res, next) => integrationController.disconnect(req, res, next));
integrationRouter.get('/integrations/slack/channels', authMiddleware, (req, res, next) => integrationController.getSlackChannels(req, res, next));
integrationRouter.patch('/integrations/slack', authMiddleware, validate({ body: slackChannelSchema }), (req, res, next) => integrationController.updateSlackChannel(req, res, next));
integrationRouter.post('/integrations/slack/test', authMiddleware, (req, res, next) => integrationController.sendTestSlack(req, res, next));
