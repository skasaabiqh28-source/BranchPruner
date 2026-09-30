import { metricsService } from '../services/metrics.service.js';
export class MetricsController {
    async getMetrics(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const metrics = await metricsService.getMetrics(workspaceId);
            res.status(200).json(metrics);
        }
        catch (err) {
            next(err);
        }
    }
}
export const metricsController = new MetricsController();
