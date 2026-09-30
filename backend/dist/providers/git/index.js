import { GitHubProvider } from './github.provider.js';
import { GitLabProvider } from './gitlab.provider.js';
import { MockProvider } from './mock.provider.js';
import { env } from '../../config/env.js';
let mockProviderInstance = null;
let githubProviderInstance = null;
let gitlabProviderInstance = null;
export function getGitProvider(provider = 'github', forceLive = false) {
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
export function getMockGitProvider() {
    if (!mockProviderInstance) {
        mockProviderInstance = new MockProvider();
    }
    return mockProviderInstance;
}
export * from './git-provider.interface.js';
