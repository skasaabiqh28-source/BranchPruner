import { Octokit } from '@octokit/rest';
import { logger } from '../../config/logger.js';
export class GitHubProvider {
    getClient(token) {
        return new Octokit({ auth: token || process.env.GITHUB_TOKEN });
    }
    parseRepoFullName(fullName) {
        const [owner, repo] = fullName.split('/');
        if (!owner || !repo) {
            throw new Error(`Invalid GitHub repository fullName: ${fullName}`);
        }
        return { owner, repo };
    }
    async listRepos(token) {
        const octokit = this.getClient(token);
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            per_page: 100,
            sort: 'updated'
        });
        return data.map((r) => ({
            id: String(r.id),
            fullName: r.full_name,
            defaultBranch: r.default_branch,
            provider: 'github'
        }));
    }
    async listBranches(repoFullName, token) {
        const octokit = this.getClient(token);
        const { owner, repo } = this.parseRepoFullName(repoFullName);
        const { data: branches } = await octokit.rest.repos.listBranches({
            owner,
            repo,
            per_page: 100
        });
        const result = [];
        for (const b of branches) {
            try {
                const { data: commitData } = await octokit.rest.repos.getCommit({
                    owner,
                    repo,
                    ref: b.commit.sha
                });
                result.push({
                    name: b.name,
                    commitSha: b.commit.sha,
                    commitDate: commitData.commit.committer?.date
                        ? new Date(commitData.commit.committer.date)
                        : new Date(),
                    author: commitData.commit.author?.name || 'unknown',
                    isProtected: b.protected
                });
            }
            catch (e) {
                logger.warn({ error: e, branch: b.name }, 'Failed to fetch commit details for branch');
                result.push({
                    name: b.name,
                    commitSha: b.commit.sha,
                    commitDate: new Date(),
                    author: 'unknown',
                    isProtected: b.protected
                });
            }
        }
        return result;
    }
    async getBranch(repoFullName, branchName, token) {
        const octokit = this.getClient(token);
        const { owner, repo } = this.parseRepoFullName(repoFullName);
        try {
            const { data: b } = await octokit.rest.repos.getBranch({
                owner,
                repo,
                branch: branchName
            });
            const { data: commitData } = await octokit.rest.repos.getCommit({
                owner,
                repo,
                ref: b.commit.sha
            });
            return {
                name: b.name,
                commitSha: b.commit.sha,
                commitDate: commitData.commit.committer?.date
                    ? new Date(commitData.commit.committer.date)
                    : new Date(),
                author: commitData.commit.author?.name || 'unknown',
                isProtected: b.protected
            };
        }
        catch (e) {
            if (e.status === 404) {
                return null;
            }
            throw e;
        }
    }
    async createArchiveRef(repoFullName, branchName, commitSha, token) {
        const octokit = this.getClient(token);
        const { owner, repo } = this.parseRepoFullName(repoFullName);
        const ref = `refs/branchpruner/archive/${branchName}`;
        await octokit.rest.git.createRef({
            owner,
            repo,
            ref,
            sha: commitSha
        });
        logger.info({ repoFullName, ref, commitSha }, '[GitHubProvider] Created archive ref');
        return ref;
    }
    async deleteBranch(repoFullName, branchName, token) {
        const octokit = this.getClient(token);
        const { owner, repo } = this.parseRepoFullName(repoFullName);
        try {
            await octokit.rest.git.deleteRef({
                owner,
                repo,
                ref: `heads/${branchName}`
            });
            logger.info({ repoFullName, branchName }, '[GitHubProvider] Deleted remote branch');
            return true;
        }
        catch (e) {
            logger.error({ error: e, repoFullName, branchName }, '[GitHubProvider] Failed to delete branch');
            throw e;
        }
    }
    async createBranchFromSha(repoFullName, branchName, commitSha, token) {
        const octokit = this.getClient(token);
        const { owner, repo } = this.parseRepoFullName(repoFullName);
        try {
            await octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${branchName}`,
                sha: commitSha
            });
            logger.info({ repoFullName, branchName, commitSha }, '[GitHubProvider] Recreated branch from SHA');
            return true;
        }
        catch (e) {
            const status = e.status;
            if (status === 422 || status === 409) {
                const conflictErr = new Error(`Branch '${branchName}' already exists on remote`);
                conflictErr.status = 409;
                throw conflictErr;
            }
            throw e;
        }
    }
    async deleteArchiveRef(repoFullName, ref, token) {
        const octokit = this.getClient(token);
        const { owner, repo } = this.parseRepoFullName(repoFullName);
        // Strip leading refs/ if needed by Octokit deleteRef
        const formattedRef = ref.startsWith('refs/') ? ref.replace('refs/', '') : ref;
        try {
            await octokit.rest.git.deleteRef({
                owner,
                repo,
                ref: formattedRef
            });
            logger.info({ repoFullName, ref }, '[GitHubProvider] Deleted archive ref (rollback)');
            return true;
        }
        catch (e) {
            logger.warn({ error: e, repoFullName, ref }, '[GitHubProvider] Failed to delete archive ref rollback');
            return false;
        }
    }
}
