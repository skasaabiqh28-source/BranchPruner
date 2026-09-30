import { webhookService } from '../services/webhook.service.js';
import { ERROR_CODES } from '../config/constants.js';
export class WebhookController {
    async handleGitHubWebhook(req, res, next) {
        try {
            const signature = req.headers['x-hub-signature-256'];
            const event = req.headers['x-github-event'];
            // In production/live mode, verify HMAC signature
            const rawBody = req.rawBody || JSON.stringify(req.body);
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
        }
        catch (err) {
            next(err);
        }
    }
}
export const webhookController = new WebhookController();
