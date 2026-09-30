import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { auditEventRepository } from '../repositories/audit-event.repository.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
export class WebhookService {
    verifyGitHubSignature(rawBody, signatureHeader) {
        if (!signatureHeader)
            return false;
        const secret = env.GITHUB_WEBHOOK_SECRET;
        const hmac = crypto.createHmac('sha256', secret);
        const expected = 'sha256=' + hmac.update(rawBody).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
        }
        catch {
            return false;
        }
    }
    async handleGitHubWebhook(event, payload) {
        if (event !== 'push' || !payload.ref || !payload.repository) {
            return { handled: false, reason: 'Ignored non-push or incomplete event' };
        }
        const branchName = payload.ref.replace('refs/heads/', '');
        const repoFullName = payload.repository.full_name;
        const commitSha = payload.after || payload.head_commit?.id || 'HEAD';
        const commitDate = payload.head_commit?.timestamp ? new Date(payload.head_commit.timestamp) : new Date();
        logger.info({ repoFullName, branchName, commitSha }, '[WebhookService] Received push event');
        // Find repository in any workspace
        const repo = await prisma.repository.findFirst({
            where: { fullName: repoFullName }
        });
        if (!repo) {
            return { handled: false, reason: 'Repository not tracked' };
        }
        // Find branch
        const branch = await prisma.branch.findUnique({
            where: {
                repositoryId_name: {
                    repositoryId: repo.id,
                    name: branchName
                }
            }
        });
        if (!branch) {
            return { handled: false, reason: 'Branch not tracked' };
        }
        // Reset staleness: active status, clear flags
        await prisma.branch.update({
            where: { id: branch.id },
            data: {
                status: 'active',
                lastCommitSha: commitSha,
                lastCommitAt: commitDate,
                flaggedAt: null,
                deadlineAt: null,
                warnedAt: null
            }
        });
        await auditEventRepository.create({
            workspaceId: repo.workspaceId,
            actorId: null,
            type: 'WEBHOOK_PUSH_RESET',
            payload: {
                repoFullName,
                branchName,
                commitSha,
                previousStatus: branch.status
            },
            dryRun: false
        });
        logger.info({ repoFullName, branchName }, '[WebhookService] Reset staleness for branch on push');
        return { handled: true, branch: branchName, status: 'active' };
    }
}
export const webhookService = new WebhookService();
