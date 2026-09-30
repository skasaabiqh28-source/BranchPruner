import { apiClient } from './client.ts';
import {
  UserProfile,
  Repository,
  Branch,
  ActivityItem,
  IntegrationsState,
  MetricsData,
  SettingsData,
  ProtectedPatternItem
} from '../types.ts';

export const authApi = {
  register: async (payload: { email: string; password: string; name?: string }) => {
    return apiClient<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  verifyEmail: async (token: string) => {
    return apiClient<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  resendVerification: async (email: string) => {
    return apiClient<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  login: async (credentials: { email: string; password: string }) => {
    return apiClient<{ user: UserProfile; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  forgotPassword: async (email: string) => {
    return apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword: async (payload: { token: string; newPassword: string }) => {
    return apiClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  logout: async () => {
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST'
    });
  },

  getMe: async () => {
    return apiClient<UserProfile>('/me', {
      method: 'GET'
    });
  }
};

export const metricsApi = {
  getMetrics: async () => {
    return apiClient<MetricsData>('/metrics', {
      method: 'GET'
    });
  }
};

export const repositoriesApi = {
  listRepositories: async () => {
    return apiClient<Repository[]>('/repositories', {
      method: 'GET'
    });
  },

  scanRepository: async (repoFullName: string, token?: string) => {
    return apiClient<{
      repository: Repository;
      branchesCount: number;
      staleCount: number;
      branches: any[];
    }>('/repositories/scan', {
      method: 'POST',
      body: JSON.stringify({ repoFullName, token })
    });
  }
};

export interface RawPendingBranch {
  id: string;
  repository: { id: string; fullName: string };
  branchName: string;
  author: string;
  stalenessDays: number;
  deadlineAt: string;
  timeLeftSeconds: number;
  isUrgent: boolean;
}

export interface PendingBranchesResponse {
  items: RawPendingBranch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function inferCategory(branchName: string): Branch['category'] {
  const lower = branchName.toLowerCase();
  if (lower.startsWith('feat/') || lower.startsWith('feature/')) return 'feature';
  if (lower.startsWith('spike/')) return 'spike';
  if (lower.startsWith('chore/')) return 'chore';
  if (lower.startsWith('fix/') || lower.startsWith('bugfix/') || lower.startsWith('hotfix/')) return 'fix';
  if (lower.startsWith('experiment/') || lower.startsWith('exp/')) return 'experiment';
  if (lower.startsWith('temp/')) return 'temp';
  return 'feature';
}

function getInitials(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9.]/g, '').split('.');
  return parts.map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 2) || 'DV';
}

export const branchesApi = {
  listPending: async (params: {
    search?: string;
    repoId?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ branches: Branch[]; total: number }> => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.repoId && params.repoId !== 'all') searchParams.set('repoId', params.repoId);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.order) searchParams.set('order', params.order);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    const endpoint = `/pending-branches${qs ? `?${qs}` : ''}`;
    const res = await apiClient<PendingBranchesResponse>(endpoint, { method: 'GET' });

    const branches: Branch[] = res.items.map((item) => ({
      id: item.id,
      repo: item.repository.fullName,
      branchName: item.branchName,
      author: item.author,
      authorInitials: getInitials(item.author),
      daysStale: item.stalenessDays,
      hoursLeft: Math.max(0, Math.round(item.timeLeftSeconds / 3600)),
      category: inferCategory(item.branchName)
    }));

    return { branches, total: res.total };
  },

  notifySlack: async (id: string) => {
    return apiClient<{ success: boolean; message: string; channel: string }>(
      `/pending-branches/${id}/notify-slack`,
      { method: 'POST' }
    );
  },

  keep: async (id: string) => {
    return apiClient<{ undoToken: string; undoExpiresAt: string; keptUntil: string }>(
      `/pending-branches/${id}/keep`,
      { method: 'POST' }
    );
  },

  undoKeep: async (id: string, undoToken: string) => {
    return apiClient<{ success: boolean; message: string }>(
      `/pending-branches/${id}/undo-keep`,
      {
        method: 'POST',
        body: JSON.stringify({ undoToken })
      }
    );
  },

  prune: async (id: string, confirm = true) => {
    return apiClient<{
      dryRun?: boolean;
      wouldDo?: string;
      target?: { id: string; branchName: string; repo: string };
      success?: boolean;
      commitHash?: string;
      archiveRef?: string;
    }>(`/pending-branches/${id}/prune`, {
      method: 'POST',
      body: JSON.stringify({ confirm })
    });
  }
};

export interface RawActivityItem {
  id: string;
  repository: { id: string; fullName: string };
  prunedBranch: string;
  archivedCommitHash: string;
  prunedAt: string;
  status: string;
  restoredAt?: string | null;
}

function formatRelativeTime(dateIso: string): string {
  const timestamp = new Date(dateIso).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export const activityApi = {
  listActivity: async (params: { repoId?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.repoId && params.repoId !== 'all') searchParams.set('repoId', params.repoId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    const endpoint = `/activity${qs ? `?${qs}` : ''}`;
    const res = await apiClient<{ items: RawActivityItem[]; total: number }>(endpoint, { method: 'GET' });

    const activity: ActivityItem[] = res.items.map((item) => ({
      id: item.id,
      repo: item.repository.fullName,
      branchName: item.prunedBranch,
      commitHash: item.archivedCommitHash,
      prunedWhen: formatRelativeTime(item.prunedAt),
      prunedTimestamp: new Date(item.prunedAt).getTime(),
      status: (item.status as 'archived' | 'restored') || 'archived',
      restoredAt: item.restoredAt
    }));

    return { activity, total: res.total };
  },

  restore: async (id: string) => {
    return apiClient<{
      dryRun?: boolean;
      wouldDo?: string;
      target?: { id: string; branchName: string; repo: string };
      success?: boolean;
      alreadyRestored?: boolean;
      message?: string;
      commitHash?: string;
      branchName?: string;
    }>(`/activity/${id}/restore`, {
      method: 'POST'
    });
  }
};

export const integrationsApi = {
  list: async (): Promise<IntegrationsState> => {
    const list = await apiClient<
      Array<{
        provider: 'github' | 'gitlab' | 'slack';
        status: 'connected' | 'disconnected';
        connectedAs: string | null;
        lastSyncedAt: string | null;
        config: any;
      }>
    >('/integrations', { method: 'GET' });

    const state: IntegrationsState = {
      github: {
        connected: false,
        user: null,
        lastSynced: 'Never',
        status: 'disconnected',
        accountType: 'GitHub Enterprise Org'
      },
      gitlab: {
        connected: false,
        user: null,
        lastSynced: 'Never',
        status: 'disconnected',
        accountType: 'Self-Hosted or SaaS'
      },
      slack: {
        connected: false,
        user: null,
        lastSynced: 'Never',
        status: 'disconnected',
        channel: '#git-hygiene',
        availableChannels: ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage']
      }
    };

    for (const item of list) {
      const isConnected = item.status === 'connected';
      const lastSynced = item.lastSyncedAt ? formatRelativeTime(item.lastSyncedAt) : 'Never';

      if (item.provider === 'github') {
        state.github = {
          connected: isConnected,
          user: item.connectedAs,
          lastSynced,
          status: isConnected ? 'active' : 'disconnected',
          accountType: item.config?.accountType || 'GitHub Enterprise Org'
        };
      } else if (item.provider === 'gitlab') {
        state.gitlab = {
          connected: isConnected,
          user: item.connectedAs,
          lastSynced,
          status: isConnected ? 'active' : 'disconnected',
          accountType: item.config?.accountType || 'Self-Hosted or SaaS'
        };
      } else if (item.provider === 'slack') {
        state.slack = {
          connected: isConnected,
          user: item.connectedAs,
          lastSynced,
          status: isConnected ? 'active' : 'disconnected',
          channel: item.config?.channel || '#git-hygiene',
          availableChannels: item.config?.availableChannels || ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage']
        };
      }
    }

    return state;
  },

  connect: async (
    provider: 'github' | 'gitlab' | 'slack',
    payload?: string | { token?: string; username?: string; repoFullName?: string }
  ) => {
    const body = typeof payload === 'string' ? { token: payload } : payload || {};
    return apiClient(`/integrations/${provider}/connect`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  disconnect: async (provider: 'github' | 'gitlab' | 'slack') => {
    return apiClient(`/integrations/${provider}`, {
      method: 'DELETE'
    });
  },

  getSlackChannels: async () => {
    return apiClient<{ channels: string[] }>('/integrations/slack/channels', {
      method: 'GET'
    });
  },

  updateSlackChannel: async (channel: string) => {
    return apiClient<{ success: boolean; channel: string }>('/integrations/slack', {
      method: 'PATCH',
      body: JSON.stringify({ channel })
    });
  },

  sendTestSlack: async () => {
    return apiClient<{ success: boolean; channel: string }>('/integrations/slack/test', {
      method: 'POST'
    });
  }
};

export const rulesApi = {
  listProtectedBranches: async () => {
    return apiClient<ProtectedPatternItem[]>('/rules/protected-branches', {
      method: 'GET'
    });
  },

  addProtectedBranch: async (pattern: string) => {
    return apiClient<ProtectedPatternItem>('/rules/protected-branches', {
      method: 'POST',
      body: JSON.stringify({ pattern })
    });
  },

  deleteProtectedBranch: async (id: string) => {
    return apiClient<{ success: boolean; deletedPattern: string }>(`/rules/protected-branches/${id}`, {
      method: 'DELETE'
    });
  }
};

export const settingsApi = {
  getSettings: async () => {
    return apiClient<SettingsData>('/settings', {
      method: 'GET'
    });
  },

  updateSettings: async (settings: Partial<SettingsData>) => {
    return apiClient<SettingsData>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }
};
