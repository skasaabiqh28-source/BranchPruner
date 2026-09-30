import { Router } from 'express';
import { authRouter, meRouter } from './auth.routes.js';
import { metricsRouter } from './metrics.routes.js';
import { repositoryRouter } from './repository.routes.js';
import { branchRouter } from './branch.routes.js';
import { activityRouter } from './activity.routes.js';
import { integrationRouter } from './integration.routes.js';
import { rulesRouter } from './rules.routes.js';
import { settingsRouter } from './settings.routes.js';
import { webhookRouter } from './webhook.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/', meRouter);
apiRouter.use('/', metricsRouter);
apiRouter.use('/', repositoryRouter);
apiRouter.use('/', branchRouter);
apiRouter.use('/', activityRouter);
apiRouter.use('/', integrationRouter);
apiRouter.use('/', rulesRouter);
apiRouter.use('/', settingsRouter);
apiRouter.use('/', webhookRouter);
