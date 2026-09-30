import { repositoryRepository } from '../repositories/repository.repository.js';
import { integrationService } from '../services/integration.service.js';
export class RepositoryController {
    async listRepositories(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const repos = await repositoryRepository.listByWorkspace(workspaceId);
            const items = [
                { id: 'all', name: 'All Repositories' },
                ...repos.map((r) => ({
                    id: r.id,
                    name: r.fullName
                }))
            ];
            res.status(200).json(items);
        }
        catch (err) {
            next(err);
        }
    }
    async scanRepository(req, res, next) {
        try {
            const workspaceId = req.user.workspaceId;
            const { repoFullName, token } = req.body;
            if (!repoFullName || !repoFullName.includes('/')) {
                res.status(400).json({
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Valid repository in owner/repo format is required (e.g. octocat/Spoon-Knife)'
                    }
                });
                return;
            }
            const result = await integrationService.scanAndImportRepository(workspaceId, repoFullName, token);
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
export const repositoryController = new RepositoryController();
