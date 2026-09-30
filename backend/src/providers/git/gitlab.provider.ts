import axios, { AxiosInstance } from 'axios';
import { GitProvider, RemoteRepo, RemoteBranch } from './git-provider.interface.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class GitLabProvider implements GitProvider {
  private getClient(token?: string): AxiosInstance {
    return axios.create({
      baseURL: env.GITLAB_API_URL,
      headers: {
        'PRIVATE-TOKEN': token || env.GITLAB_TOKEN
      }
    });
  }

  private encodeRepo(repoFullName: string): string {
    return encodeURIComponent(repoFullName);
  }

  async listRepos(token?: string): Promise<RemoteRepo[]> {
    const client = this.getClient(token);
    const { data } = await client.get('/projects', {
      params: { membership: true, per_page: 100 }
    });

    return data.map((p: { id: number; path_with_namespace: string; default_branch: string }) => ({
      id: String(p.id),
      fullName: p.path_with_namespace,
      defaultBranch: p.default_branch || 'main',
      provider: 'gitlab' as const
    }));
  }

  async listBranches(repoFullName: string, token?: string): Promise<RemoteBranch[]> {
    const client = this.getClient(token);
    const encoded = this.encodeRepo(repoFullName);

    const { data } = await client.get(`/projects/${encoded}/repository/branches`, {
      params: { per_page: 100 }
    });

    return data.map((b: { name: string; commit: { id: string; committed_date: string; author_name: string }; protected: boolean }) => ({
      name: b.name,
      commitSha: b.commit.id,
      commitDate: new Date(b.commit.committed_date),
      author: b.commit.author_name || 'unknown',
      isProtected: b.protected
    }));
  }

  async getBranch(repoFullName: string, branchName: string, token?: string): Promise<RemoteBranch | null> {
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
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        return null;
      }
      throw e;
    }
  }

  async createArchiveRef(repoFullName: string, branchName: string, commitSha: string, token?: string): Promise<string> {
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
    } catch (e) {
      logger.error({ error: e, repoFullName, branchName }, '[GitLabProvider] Failed to create archive tag');
      throw e;
    }
  }

  async deleteBranch(repoFullName: string, branchName: string, token?: string): Promise<boolean> {
    const client = this.getClient(token);
    const encoded = this.encodeRepo(repoFullName);
    const encodedBranch = encodeURIComponent(branchName);

    try {
      await client.delete(`/projects/${encoded}/repository/branches/${encodedBranch}`);
      logger.info({ repoFullName, branchName }, '[GitLabProvider] Deleted remote branch');
      return true;
    } catch (e) {
      logger.error({ error: e, repoFullName, branchName }, '[GitLabProvider] Failed to delete branch');
      throw e;
    }
  }

  async createBranchFromSha(repoFullName: string, branchName: string, commitSha: string, token?: string): Promise<boolean> {
    const client = this.getClient(token);
    const encoded = this.encodeRepo(repoFullName);

    try {
      await client.post(`/projects/${encoded}/repository/branches`, {
        branch: branchName,
        ref: commitSha
      });
      logger.info({ repoFullName, branchName, commitSha }, '[GitLabProvider] Created branch from commit SHA');
      return true;
    } catch (e) {
      if (axios.isAxiosError(e) && (e.response?.status === 400 || e.response?.status === 409)) {
        const conflictErr = new Error(`Branch '${branchName}' already exists on GitLab remote`);
        (conflictErr as unknown as { status: number }).status = 409;
        throw conflictErr;
      }
      throw e;
    }
  }

  async deleteArchiveRef(repoFullName: string, ref: string, token?: string): Promise<boolean> {
    const client = this.getClient(token);
    const encoded = this.encodeRepo(repoFullName);
    const tagName = ref.replace('refs/branchpruner/archive/', 'archive-').replace(/\//g, '-');

    try {
      await client.delete(`/projects/${encoded}/repository/tags/${encodeURIComponent(tagName)}`);
      return true;
    } catch (e) {
      logger.warn({ error: e, repoFullName, ref }, '[GitLabProvider] Failed to delete archive ref rollback');
      return false;
    }
  }
}
