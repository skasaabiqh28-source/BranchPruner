import { Repository, Branch, ActivityItem, IntegrationsState, UserProfile } from '../types.ts';

export const INITIAL_REPOSITORIES: Repository[] = [
  { id: 'all', name: 'All Repositories' },
  { id: 'core-api', name: 'org/core-api' },
  { id: 'web-client', name: 'org/web-client' },
  { id: 'infra-terraform', name: 'org/infra-terraform' },
  { id: 'auth-service', name: 'org/auth-service' },
  { id: 'billing-pipeline', name: 'org/billing-pipeline' }
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'b-1',
    repo: 'org/core-api',
    branchName: 'feat/checkout-v2-redesign',
    author: 'sarah.dev',
    authorInitials: 'SD',
    daysStale: 135,
    hoursLeft: 14, // < 48 hours -> critical
    category: 'feature'
  },
  {
    id: 'b-2',
    repo: 'org/web-client',
    branchName: 'spike/webrtc-audio-poc',
    author: 'marcus.k',
    authorInitials: 'MK',
    daysStale: 72,
    hoursLeft: 38, // < 48 hours -> critical
    category: 'spike'
  },
  {
    id: 'b-3',
    repo: 'org/core-api',
    branchName: 'chore/dep-upgrade-node20',
    author: 'alex.tan',
    authorInitials: 'AT',
    daysStale: 44,
    hoursLeft: 96,
    category: 'chore'
  },
  {
    id: 'b-4',
    repo: 'org/infra-terraform',
    branchName: 'fix/s3-retention-test',
    author: 'elena.rodriguez',
    authorInitials: 'ER',
    daysStale: 89,
    hoursLeft: 122,
    category: 'fix'
  },
  {
    id: 'b-5',
    repo: 'org/auth-service',
    branchName: 'experiment/passkeys-fido2',
    author: 'devon.miles',
    authorInitials: 'DM',
    daysStale: 34,
    hoursLeft: 154,
    category: 'experiment'
  },
  {
    id: 'b-6',
    repo: 'org/web-client',
    branchName: 'temp/table-virtualization',
    author: 'sarah.dev',
    authorInitials: 'SD',
    daysStale: 148,
    hoursLeft: 22, // < 48 hours -> critical
    category: 'temp'
  },
  {
    id: 'b-7',
    repo: 'org/billing-pipeline',
    branchName: 'test/stripe-webhook-sandbox',
    author: 'kenji.s',
    authorInitials: 'KS',
    daysStale: 52,
    hoursLeft: 64,
    category: 'chore'
  }
];

export const INITIAL_ACTIVITY: ActivityItem[] = [
  {
    id: 'act-1',
    repo: 'org/core-api',
    branchName: 'feat/graphql-legacy-endpoint',
    commitHash: '7b2a9f14',
    prunedWhen: '2 hours ago',
    prunedTimestamp: Date.now() - 7200000
  },
  {
    id: 'act-2',
    repo: 'org/web-client',
    branchName: 'quickfix/nav-icon-alignment',
    commitHash: '3e41c09b',
    prunedWhen: 'Yesterday, 16:40',
    prunedTimestamp: Date.now() - 86400000
  },
  {
    id: 'act-3',
    repo: 'org/auth-service',
    branchName: 'debug/jwt-expiry-race',
    commitHash: 'f90c12da',
    prunedWhen: '3 days ago',
    prunedTimestamp: Date.now() - 259200000
  }
];

export const INITIAL_INTEGRATIONS: IntegrationsState = {
  github: {
    connected: true,
    user: '@pruner-bot-ci',
    lastSynced: 'Just now',
    accountType: 'GitHub Enterprise Org',
    status: 'active'
  },
  gitlab: {
    connected: false,
    user: null,
    lastSynced: 'Never',
    accountType: 'Self-Hosted or SaaS',
    status: 'disconnected'
  },
  slack: {
    connected: true,
    user: '@devops-notify',
    lastSynced: '14 min ago',
    channel: '#git-hygiene',
    availableChannels: ['#git-hygiene', '#dev-alerts', '#engineering-all', '#triage'],
    status: 'active'
  }
};

export const MOCK_USER: UserProfile = {
  name: 'Jordan Alvarez',
  handle: '@jalvarez',
  role: 'Staff DevOps Architect',
  email: 'jordan.alvarez@company.com',
  initials: 'JA'
};

export const DEFAULT_PROTECTED_PATTERNS = [
  'main',
  'master',
  'release/*',
  'hotfix/*',
  'prod-v*'
];
