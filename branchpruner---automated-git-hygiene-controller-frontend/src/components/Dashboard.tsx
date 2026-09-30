import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GitBranch,
  Shield,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  UserProfile,
  Repository,
  Branch,
  ActivityItem,
  IntegrationsState,
  ToastMessage,
  ProtectedPatternItem,
  MetricsData,
  SettingsData
} from '../types.ts';
import {
  authApi,
  repositoriesApi,
  branchesApi,
  activityApi,
  integrationsApi,
  rulesApi,
  settingsApi,
  metricsApi
} from '../api/index.ts';
import { DashboardView } from './DashboardView.tsx';
import { IntegrationsView } from './IntegrationsView.tsx';
import { RulesView } from './RulesView.tsx';
import { Modal } from './Modal.tsx';
import { ToastContainer } from './ToastContainer.tsx';

interface DashboardProps {
  user: UserProfile;
  onSignOut: () => void;
  onNavigateToSplash: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onSignOut,
  onNavigateToSplash
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'integrations' | 'rules'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core API state
  const [isDryRun, setIsDryRun] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([
    { id: 'all', name: 'All Repositories' }
  ]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationsState>({
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
  });

  const [metrics, setMetrics] = useState<MetricsData>({
    repositoriesTracked: 0,
    clutterReducedPercent: 0,
    clutterTargetPercent: 80,
    activeSnapshots: 0
  });

  // Safety Rules state
  const [protectedPatternList, setProtectedPatternList] = useState<ProtectedPatternItem[]>([]);
  const [staleThresholdDays, setStaleThresholdDays] = useState(30);

  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepoFilter, setSelectedRepoFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timeLeft');

  // Confirmation modal
  const [pruneModalTarget, setPruneModalTarget] = useState<Branch | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, options: Partial<ToastMessage> = {}) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      id,
      message,
      isDryRun: options.isDryRun ?? false,
      undoAction: options.undoAction ?? false,
      branchData: options.branchData,
      originalIndex: options.originalIndex,
      undoToken: options.undoToken
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch helpers
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await metricsApi.getMetrics();
      setMetrics(data);
    } catch {
      // Ignore
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const { branches: fetched } = await branchesApi.listPending({
        search: searchQuery,
        repoId: selectedRepoFilter,
        sort: sortBy
      });
      setBranches(fetched);
    } catch {
      // Ignore
    }
  }, [searchQuery, selectedRepoFilter, sortBy]);

  const fetchActivity = useCallback(async () => {
    try {
      const { activity: fetched } = await activityApi.listActivity({
        repoId: selectedRepoFilter
      });
      setActivity(fetched);
    } catch {
      // Ignore
    }
  }, [selectedRepoFilter]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const data = await integrationsApi.list();
      setIntegrations(data);
    } catch {
      // Ignore
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const data = await rulesApi.listProtectedBranches();
      setProtectedPatternList(data);
    } catch {
      // Ignore
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await settingsApi.getSettings();
      setIsDryRun(data.dryRun);
      setStaleThresholdDays(data.staleAfterDays);
    } catch {
      // Ignore
    }
  }, []);

  const fetchRepositories = useCallback(async () => {
    try {
      const list = await repositoriesApi.listRepositories();
      if (list && list.length > 0) {
        setRepositories(list);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      setIsLoading(true);
      await Promise.allSettled([
        fetchRepositories(),
        fetchMetrics(),
        fetchBranches(),
        fetchActivity(),
        fetchIntegrations(),
        fetchRules(),
        fetchSettings()
      ]);
      if (mounted) setIsLoading(false);
    }
    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  // Re-fetch branches whenever search, filter, or sort changes
  useEffect(() => {
    fetchBranches();
  }, [searchQuery, selectedRepoFilter, sortBy, fetchBranches]);

  // Derived pattern list for RulesView
  const protectedPatternStrings = useMemo(() => {
    return protectedPatternList.map((p) => p.pattern);
  }, [protectedPatternList]);

  // Actions
  const handleNotifySlack = async (branch: Branch) => {
    if (!integrations.slack.connected) {
      addToast('Cannot notify: Slack is disconnected. Enable it in VCS & Webhooks tab.');
      return;
    }

    try {
      const res = await branchesApi.notifySlack(branch.id);
      if (isDryRun) {
        addToast(`[Dry-Run] Dispatched automated reminder to ${res.channel} for ${branch.branchName}`, {
          isDryRun: true
        });
      } else {
        addToast(`Alert sent to ${res.channel} for branch author @${branch.author}`);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to dispatch Slack alert');
    }
  };

  const handleKeepBranch = async (branch: Branch) => {
    const originalIndex = branches.findIndex((b) => b.id === branch.id);
    setBranches((prev) => prev.filter((b) => b.id !== branch.id));

    try {
      const res = await branchesApi.keep(branch.id);
      if (isDryRun) {
        addToast(`[Dry-Run] Whitelisted ${branch.branchName} from automated pruning`, {
          isDryRun: true,
          undoAction: true,
          branchData: branch,
          originalIndex,
          undoToken: res.undoToken
        });
      } else {
        addToast(`Extended grace period by ${staleThresholdDays} days for ${branch.branchName}`, {
          undoAction: true,
          branchData: branch,
          originalIndex,
          undoToken: res.undoToken
        });
      }
      fetchMetrics();
    } catch (err: any) {
      fetchBranches();
      addToast(err.message || 'Failed to keep branch');
    }
  };

  const handleUndo = async (toast: ToastMessage) => {
    if (toast.branchData && toast.undoToken) {
      try {
        await branchesApi.undoKeep(toast.branchData.id, toast.undoToken);
        dismissToast(toast.id);
        addToast(`Restored ${toast.branchData.branchName} to remediation queue`);
        fetchBranches();
        fetchMetrics();
      } catch (err: any) {
        addToast(err.message || 'Undo token expired or invalid');
      }
    } else {
      dismissToast(toast.id);
      fetchBranches();
    }
  };

  const handleConfirmPrune = async () => {
    if (!pruneModalTarget) return;
    const target = pruneModalTarget;
    setPruneModalTarget(null);

    try {
      const res = await branchesApi.prune(target.id, true);
      if (res.dryRun) {
        addToast(
          `[Dry-Run] Simulated pruning of origin/${target.branchName} and zero-loss snapshot generation`,
          { isDryRun: true }
        );
      } else {
        setBranches((prev) => prev.filter((b) => b.id !== target.id));
        const hash = res.commitHash || 'snapshot';
        addToast(`Pruned origin/${target.branchName} (Archive Tag @ ${hash})`);
        fetchActivity();
        fetchMetrics();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to prune remote branch');
    }
  };

  const handleRestoreBranch = async (actItem: ActivityItem) => {
    if (actItem.status === 'restored') {
      addToast(`origin/${actItem.branchName} is already restored on remote`);
      return;
    }

    setRestoringId(actItem.id);
    try {
      const res = await activityApi.restore(actItem.id);
      if (res.dryRun) {
        addToast(
          `[Dry-Run] Simulated 1-click ref restoration of ${actItem.branchName} from snapshot ${actItem.commitHash}`,
          { isDryRun: true }
        );
      } else {
        // Optimistically update status to 'restored' in local state immediately
        setActivity((prev) =>
          prev.map((a) => (a.id === actItem.id ? { ...a, status: 'restored' } : a))
        );
        addToast(
          res.alreadyRestored
            ? `origin/${actItem.branchName} is already restored on remote`
            : `Restored origin/${actItem.branchName} from archive snapshot [${actItem.commitHash}]`
        );
        await Promise.allSettled([fetchActivity(), fetchBranches(), fetchMetrics()]);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('already exists') || err.code === 'BRANCH_EXISTS')) {
        // Branch already exists on remote, mark it as restored in UI
        setActivity((prev) =>
          prev.map((a) => (a.id === actItem.id ? { ...a, status: 'restored' } : a))
        );
        addToast(`origin/${actItem.branchName} is already restored on remote`);
        await Promise.allSettled([fetchActivity(), fetchBranches(), fetchMetrics()]);
      } else {
        addToast(err.message || 'Failed to restore branch');
      }
    } finally {
      setRestoringId(null);
    }
  };

  const handleAddPattern = async (pattern: string): Promise<boolean> => {
    try {
      await rulesApi.addProtectedBranch(pattern);
      addToast(`Added guardrail pattern: "${pattern}". Matching branches removed from remediation.`);
      await Promise.all([fetchRules(), fetchBranches()]);
      return true;
    } catch (err: any) {
      addToast(err.message || `Failed to add pattern ${pattern}`);
      return false;
    }
  };

  const handleRemovePattern = async (pattern: string) => {
    if (pattern === 'main' || pattern === 'master') {
      addToast(`Cannot remove root branch guardrail: ${pattern}`);
      return;
    }
    const item = protectedPatternList.find((p) => p.pattern === pattern);
    if (!item) return;

    try {
      await rulesApi.deleteProtectedBranch(item.id);
      addToast(`Removed guardrail pattern: "${pattern}"`);
      await Promise.all([fetchRules(), fetchBranches()]);
    } catch (err: any) {
      addToast(err.message || `Failed to remove pattern ${pattern}`);
    }
  };

  const handleToggleDryRun = async () => {
    const next = !isDryRun;
    setIsDryRun(next);
    try {
      await settingsApi.updateSettings({ dryRun: next });
      addToast(
        next
          ? 'Dry-Run Mode Enabled: Actions are simulated without deleting remote refs.'
          : 'Dry-Run Mode Disabled: Live destructive prunes will now update remotes.',
        { isDryRun: next }
      );
    } catch (err: any) {
      setIsDryRun(!next);
      addToast(err.message || 'Failed to update dry-run mode');
    }
  };

  const handleChangeStaleThreshold = async (days: number) => {
    setStaleThresholdDays(days);
    try {
      await settingsApi.updateSettings({ staleAfterDays: days });
      addToast(`Staleness threshold updated to ${days} days`);
      fetchBranches();
    } catch (err: any) {
      addToast(err.message || 'Failed to update threshold');
    }
  };

  const handleScanRepository = async (repoFullName: string) => {
    try {
      const res = await repositoriesApi.scanRepository(repoFullName);
      addToast(`Scanned ${repoFullName}: ${res.branchesCount} branches indexed (${res.staleCount} stale).`);
      await Promise.all([fetchRepositories(), fetchBranches(), fetchMetrics()]);
    } catch (err: any) {
      addToast(err.message || `Failed to scan repository ${repoFullName}`);
    }
  };

  const handleSimulateNightlySweep = async () => {
    await fetchBranches();
    const count = branches.length;
    addToast(
      isDryRun
        ? `[Dry-Run Sweep] Evaluated ${repositories.length - 1} repos: ${count} branches eligible for pruning.`
        : `[Sweep Executed] Scanned ${repositories.length - 1} repos: notification alerts sent for ${count} branches.`,
      { isDryRun }
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F3EC] flex flex-col md:flex-row text-stone-800 antialiased font-sans">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} onUndo={handleUndo} />

      {/* Prune Confirmation Modal */}
      <Modal
        isOpen={Boolean(pruneModalTarget)}
        onClose={() => setPruneModalTarget(null)}
        title="Confirm Remote Ref Pruning"
        actions={
          <>
            <button
              type="button"
              onClick={() => setPruneModalTarget(null)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPrune}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 cursor-pointer transition-colors shadow-xs"
            >
              {isDryRun ? 'Run Simulated Prune' : 'Confirm & Prune Remote'}
            </button>
          </>
        }
      >
        {pruneModalTarget && (
          <div className="space-y-3">
            <p>
              You are about to prune the remote branch{' '}
              <span className="font-mono font-semibold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                origin/{pruneModalTarget.branchName}
              </span>{' '}
              on repository{' '}
              <span className="font-semibold text-stone-900">{pruneModalTarget.repo}</span>.
            </p>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                <CheckCircle className="w-3.5 h-3.5" />
                Zero-Loss Recovery Guarantee:
              </p>
              <p>
                An encrypted Git snapshot commit tag will be stored in your BranchPruner archive. You can restore this ref at any time with 1-click.
              </p>
            </div>
            {isDryRun && (
              <p className="text-xs font-mono text-amber-800 bg-amber-100/70 p-2.5 rounded-lg border border-amber-300">
                Notice: Dry-Run Mode is currently enabled. No remote git refs will actually be deleted.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6B7A2A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[#3B4415]">
              BranchPruner
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`${
          mobileMenuOpen ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-white/90 backdrop-blur-lg border-r border-stone-200/90 z-20 shrink-0 md:sticky md:top-0 md:h-screen`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateToSplash}
            title="View animated intro splash"
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#6B7A2A] group-hover:bg-[#4A5519] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-[#4A5519]/30 transition-colors">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-[#3B4415] leading-tight">
                BranchPruner
              </div>
              <div className="text-[10px] font-mono text-stone-400 group-hover:text-stone-600 transition-colors">
                v2.4.0-stable
              </div>
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 space-y-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#6B7A2A] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Remediation Dashboard
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('integrations');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeTab === 'integrations'
                ? 'bg-[#6B7A2A] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
            }`}
          >
            <span className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              VCS & Webhooks
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                integrations.github.connected || integrations.slack.connected ? 'bg-emerald-500' : 'bg-stone-300'
              }`}
            ></span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('rules');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-colors cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#6B7A2A] text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Rules & Guardrails
          </button>

          {/* Quick Trigger Tool in Sidebar */}
          <div className="pt-4 mt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={handleSimulateNightlySweep}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#4A5519] bg-[#6B7A2A]/10 hover:bg-[#6B7A2A]/20 border border-[#6B7A2A]/20 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#6B7A2A]" />
              Run Nightly Sweep Now
            </button>
          </div>
        </nav>

        {/* Pinned User & Sign Out */}
        <div className="p-3.5 border-t border-stone-200/80 bg-stone-50/70">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#6B7A2A]/20 text-[#3B4415] flex items-center justify-center font-bold text-xs border border-[#6B7A2A]/30 shrink-0">
                {user.initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-stone-900 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-stone-500 truncate">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onNavigateToSplash}
              title="Return to initial screen"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 transition-colors cursor-pointer"
            >
              Intro Screen
            </button>

            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out of console"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium text-stone-600 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen">
        {/* STICKY TOP CONTROLLER BAR */}
        <div className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900 tracking-tight capitalize">
                {activeTab === 'dashboard' && 'Git Hygiene Controller'}
                {activeTab === 'integrations' && 'VCS & Webhook Integrations'}
                {activeTab === 'rules' && 'Safety Rules & Guardrails'}
              </h2>
              <p className="text-xs text-stone-500">
                {activeTab === 'dashboard' && 'Automated stale remote branch detection & zero-loss archive'}
                {activeTab === 'integrations' && 'Active repository webhooks and engineer alert channels'}
                {activeTab === 'rules' && 'Protected ref glob patterns and staleness time limits'}
              </p>
            </div>
            {isDryRun && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                Dry-Run
              </span>
            )}
          </div>

          {/* DRY RUN TOGGLE SWITCH */}
          <div className="flex items-center gap-3 bg-stone-100/90 p-1.5 rounded-xl border border-stone-200 self-start sm:self-auto shadow-2xs">
            <span className="text-xs font-semibold text-stone-700 pl-2">
              Dry-Run Mode
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isDryRun}
              onClick={handleToggleDryRun}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6B7A2A] ${
                isDryRun ? 'bg-amber-600' : 'bg-stone-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isDryRun ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* TAB CONTENT VIEWPORT */}
        <div className="p-6 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              repositories={repositories}
              branches={branches}
              activity={activity}
              activeSnapshotsCount={metrics.activeSnapshots}
              clutterReducedPercentage={metrics.clutterReducedPercent}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedRepoFilter={selectedRepoFilter}
              setSelectedRepoFilter={setSelectedRepoFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onNotifySlack={handleNotifySlack}
              onKeepBranch={handleKeepBranch}
              onOpenPruneModal={(branch) => setPruneModalTarget(branch)}
              onRestoreBranch={handleRestoreBranch}
              onScanRepository={handleScanRepository}
              restoringId={restoringId}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsView
              integrations={integrations}
              onToggleGithub={async (opts) => {
                try {
                  if (integrations.github.connected && !opts) {
                    await integrationsApi.disconnect('github');
                    addToast('Disconnected GitHub account');
                  } else {
                    await integrationsApi.connect('github', opts);
                    addToast('Connected GitHub account and indexed remote branches!');
                    await Promise.all([fetchRepositories(), fetchBranches(), fetchMetrics()]);
                  }
                  fetchIntegrations();
                } catch (err: any) {
                  addToast(err.message || 'Failed to update GitHub integration');
                }
              }}
              onToggleGitlab={async () => {
                const next = !integrations.gitlab.connected;
                try {
                  if (next) {
                    await integrationsApi.connect('gitlab');
                    addToast('Connected GitLab repository cluster');
                  } else {
                    await integrationsApi.disconnect('gitlab');
                    addToast('Disconnected GitLab');
                  }
                  fetchIntegrations();
                } catch (err: any) {
                  addToast(err.message || 'Failed to update GitLab integration');
                }
              }}
              onToggleSlack={async () => {
                const next = !integrations.slack.connected;
                try {
                  if (next) {
                    await integrationsApi.connect('slack');
                    addToast('Connected Slack workspace webhook');
                  } else {
                    await integrationsApi.disconnect('slack');
                    addToast('Disconnected Slack webhook');
                  }
                  fetchIntegrations();
                } catch (err: any) {
                  addToast(err.message || 'Failed to update Slack integration');
                }
              }}
              onUpdateSlackChannel={async (ch) => {
                try {
                  await integrationsApi.updateSlackChannel(ch);
                  addToast(`Updated notification target channel to ${ch}`);
                  fetchIntegrations();
                } catch (err: any) {
                  addToast(err.message || 'Failed to update channel');
                }
              }}
              onSendTestSlack={async () => {
                try {
                  await integrationsApi.sendTestSlack();
                  addToast(`Dispatched test git hygiene alert to ${integrations.slack.channel || '#git-hygiene'}`);
                } catch (err: any) {
                  addToast(err.message || 'Failed to send test alert');
                }
              }}
            />
          )}

          {activeTab === 'rules' && (
            <RulesView
              protectedPatterns={protectedPatternStrings}
              staleThresholdDays={staleThresholdDays}
              onAddPattern={handleAddPattern}
              onRemovePattern={handleRemovePattern}
              onChangeStaleThreshold={handleChangeStaleThreshold}
              onSimulateEvaluation={() => {
                const count = branches.length;
                addToast(
                  `Evaluated rules against ${repositories.length - 1} repositories: ${count} branches qualify for remediation.`
                );
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};
