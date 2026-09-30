import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
export class GitLabProvider {
    getClient(token) {
        return axios.create({
            baseURL: env.GITLAB_API_URL,
            headers: {
                'PRIVATE-TOKEN': token || env.GITLAB_TOKEN
            }
        });
    }
    encodeRepo(repoFullName) {
        return encodeURIComponent(repoFullName);
    }
    async listRepos(token) {
        const client = this.getClient(token);
        const { data } = await client.get('/projects', {
            params: { membership: true, per_page: 100 }
        });
        return data.map((p) => ({
            id: String(p.id),
            fullName: p.path_with_namespace,
            defaultBranch: p.default_branch || 'main',
            provider: 'gitlab'
        }));
    }
    async listBranches(repoFullName, token) {
        const client = this.getClient(token);
        const encoded = this.encodeRepo(repoFullName);
        const { data } = await client.get(`/projects/${encoded}/repository/branches`, {
            params: { per_page: 100 }
        });
        return data.map((b) => ({
            name: b.name,
            commitSha: b.commit.id,
            commitDate: new Date(b.commit.committed_date),
            author: b.commit.author_name || 'unknown',
            isProtected: b.protected
        }));
    }
    async getBranch(repoFullName, branchName, token) {
        const client = this.getClient(token);
        const encoded = this.encodeRepo(repoFullName);
        const encodedBranch = encodeURIComponent(branchName);
        try {
            const { data: b } = await client.get(`/projects/${encoded}/repository/branches/${encodedBranch}`);
            return {
                name: b.name,
                commitSha: b.commit.id,
                commitDate: new Date(b.commit.committed_date),
                author: b.commit.author_name || 'unknown',
                isProtected: b.protected
            };
        }
        catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                return null;
            }
            throw e;
        }
    }
    async createArchiveRef(repoFullName, branchName, commitSha, token) {
        const client = this.getClient(token);
        const encoded = this.encodeRepo(repoFullName);
        // GitLab uses tags or refs; we create a lightweight tag for archive
        const tagName = `archive-${branchName.replace(/\//g, '-')}`;
        try {
            await client.post(`/projects/${encoded}/repository/tags`, {
                tag_name: tagName,
                ref: commitSha,
                message: `BranchPruner Archive Tag for ${branchName}`
            });
            const archiveRef = `refs/branchpruner/archive/${branchName}`;
            logger.info({ repoFullName, archiveRef, commitSha }, '[GitLabProvider] Created archive tag');
            return archiveRef;
        }
        catch (e) {
            logger.error({ error: e, repoFullName, branchName }, '[GitLabProvider] Failed to create archive tag');
            throw e;
        }
    }
    async deleteBranch(repoFullName, branchName, token) {
        const client = this.getClient(token);
        const encoded = this.encodeRepo(repoFullName);
        const encodedBranch = encodeURIComponent(branchName);
        try {
            await client.delete(`/projects/${encoded}/repository/branches/${encodedBranch}`);
            logger.info({ repoFullName, branchName }, '[GitLabProvider] Deleted remote branch');
            return true;
        }
        catch (e) {
            logger.error({ error: e, repoFullName, branchName }, '[GitLabProvider] Failed to delete branch');
            throw e;
        }
    }
    async createBranchFromSha(repoFullName, branchName, commitSha, token) {
        const client = this.getClient(token);
        const encoded = this.encodeRepo(repoFullName);
        try {
            await client.post(`/projects/${encoded}/repository/branches`, {
                branch: branchName,
                ref: commitSha
            });
            logger.info({ repoFullName, branchName, commitSha }, '[GitLabProvider] Created branch from commit SHA');
            return true;
        }
        catch (e) {
            if (axios.isAxiosError(e) && (e.response?.status === 400 || e.response?.status === 409)) {
                const conflictErr = new Error(`Branch '${branchName}' already exists on GitLab remote`);
                conflictErr.status = 409;
                throw conflictErr;
            }
            throw e;
        }
    }
    async deleteArchiveRef(repoFullName, ref, token) {
        const client = this.getClient(token);
        const encoded = this.encodeRepo(repoFullName);
        const tagName = ref.replace('refs/branchpruner/archive/', 'archive-').replace(/\//g, '-');
        try {
            await client.delete(`/projects/${encoded}/repository/tags/${encodeURIComponent(tagName)}`);
            return true;
        }
        catch (e) {
            logger.warn({ error: e, repoFullName, ref }, '[GitLabProvider] Failed to delete archive ref rollback');
            return false;
        }
    }
}
