export interface Repository {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  repo: string;
  branchName: string;
  author: string;
  authorAvatar?: string;
  authorInitials: string;
  daysStale: number;
  hoursLeft: number; // < 48 hours is critical
  category: 'feature' | 'spike' | 'chore' | 'fix' | 'experiment' | 'temp' | 'restored';
}

export interface ActivityItem {
  id: string;
  repo: string;
  branchName: string;
  commitHash: string;
  prunedWhen: string;
  prunedTimestamp: number;
  status?: 'archived' | 'restored';
  restoredAt?: string | null;
}

export interface IntegrationService {
  connected: boolean;
  user: string | null;
  lastSynced: string;
  accountType?: string;
  status: 'active' | 'disconnected';
  channel?: string;
  availableChannels?: string[];
}

export interface IntegrationsState {
  github: IntegrationService;
  gitlab: IntegrationService;
  slack: IntegrationService;
}

export interface UserProfile {
  id?: string;
  name: string;
  handle: string;
  role: string;
  email: string;
  avatar?: string;
  avatarUrl?: string | null;
  initials: string;
  emailVerified?: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  isDryRun?: boolean;
  undoAction?: boolean;
  branchData?: Branch;
  originalIndex?: number;
  undoToken?: string;
}

export interface MetricsData {
  repositoriesTracked: number;
  clutterReducedPercent: number;
  clutterTargetPercent: number;
  activeSnapshots: number;
}

export interface SettingsData {
  dryRun: boolean;
  staleAfterDays: number;
  autoPrune: boolean;
  remediationWindowDays: number;
}

export interface ProtectedPatternItem {
  id: string;
  pattern: string;
  isPreset?: boolean;
  createdAt: string;
}

