import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service.js';
import { ERROR_CODES } from '../config/constants.js';

export class WebhookController {
  async handleGitHubWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;

      // In production/live mode, verify HMAC signature
      const rawBody = (req as unknown as { rawBody?: Buffer | string }).rawBody || JSON.stringify(req.body);
      const isValid = webhookService.verifyGitHubSignature(rawBody, signature);

      // If signature is provided but invalid, reject
      if (signature && !isValid) {
        res.status(401).json({
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Invalid webhook HMAC signature',
            details: {}
          }
        });
        return;
      }

      const result = await webhookService.handleGitHubWebhook(event, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const webhookController = new WebhookController();
