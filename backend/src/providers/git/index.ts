import { GitProvider } from './git-provider.interface.js';
import { GitHubProvider } from './github.provider.js';
import { GitLabProvider } from './gitlab.provider.js';
import { MockProvider } from './mock.provider.js';
import { env } from '../../config/env.js';

let mockProviderInstance: MockProvider | null = null;
let githubProviderInstance: GitHubProvider | null = null;
let gitlabProviderInstance: GitLabProvider | null = null;

export function getGitProvider(provider: 'github' | 'gitlab' = 'github', forceLive: boolean = false): GitProvider {
  if (env.GIT_PROVIDER_MODE === 'mock' && !forceLive) {
    if (!mockProviderInstance) {
      mockProviderInstance = new MockProvider();
    }
    return mockProviderInstance;
  }

  if (provider === 'gitlab') {
    if (!gitlabProviderInstance) {
      gitlabProviderInstance = new GitLabProvider();
    }
    return gitlabProviderInstance;
  }

  if (!githubProviderInstance) {
    githubProviderInstance = new GitHubProvider();
  }
  return githubProviderInstance;
}

export function getMockGitProvider(): MockProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockProvider();
  }
  return mockProviderInstance;
}

export * from './git-provider.interface.js';
