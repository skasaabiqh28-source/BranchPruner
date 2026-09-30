import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitBranch,
  CheckCircle2,
  Shield,
  Search,
  MessageSquare,
  BookmarkCheck,
  Trash2,
  RotateCcw,
  Sparkles,
  Plus
} from 'lucide-react';
import { Branch, ActivityItem, Repository } from '../types.ts';

interface DashboardViewProps {
  repositories: Repository[];
  branches: Branch[];
  activity: ActivityItem[];
  activeSnapshotsCount: number;
  clutterReducedPercentage: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedRepoFilter: string;
  setSelectedRepoFilter: (r: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  onNotifySlack: (branch: Branch) => void;
  onKeepBranch: (branch: Branch) => void;
  onOpenPruneModal: (branch: Branch) => void;
  onRestoreBranch: (actItem: ActivityItem) => void;
  onScanRepository?: (repoFullName: string) => Promise<void>;
  restoringId?: string | null;
}

function formatTimeRemaining(hours: number): string {
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days === 0) return `${remHours}h remaining`;
  return `${days}d ${remHours}h`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  repositories,
  branches,
  activity,
  activeSnapshotsCount,
  clutterReducedPercentage,
  searchQuery,
  setSearchQuery,
  selectedRepoFilter,
  setSelectedRepoFilter,
  sortBy,
  setSortBy,
  onNotifySlack,
  onKeepBranch,
  onOpenPruneModal,
  onRestoreBranch,
  onScanRepository,
  restoringId
}) => {
  return (
    <div className="space-y-6">
      {/* 3 TOP METRIC STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white/95 rounded-2xl p-5 border border-stone-200/90 shadow-xs relative overflow-hidden transition-all duration-200 hover:border-[#6B7A2A]/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Repositories Tracked
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#6B7A2A]/10 text-[#4A5519] flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 tabular-nums">
              {repositories.length - 1}
            </span>
            <span className="text-xs font-semibold text-[#4A5519] bg-[#6B7A2A]/15 px-2 py-0.5 rounded-md">
              +2 this month
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Across GitHub Org & Infra clusters</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white/95 rounded-2xl p-5 border border-stone-200/90 shadow-xs relative overflow-hidden transition-all duration-200 hover:border-[#6B7A2A]/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Clutter Reduced
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 tabular-nums">
              {clutterReducedPercentage}%
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              Target: &gt;80%
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">1,248 stale branches pruned YTD</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white/95 rounded-2xl p-5 border border-stone-200/90 shadow-xs relative overflow-hidden transition-all duration-200 hover:border-[#6B7A2A]/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Active Snapshots
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#6B7A2A]/10 text-[#4A5519] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 tabular-nums">
              {activeSnapshotsCount}
            </span>
            <span className="text-xs font-semibold text-[#4A5519] bg-[#6B7A2A]/15 px-2 py-0.5 rounded-md">
              100% restorable
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Encrypted zero-loss recovery tags</p>
        </div>
      </div>

      {/* SECTION: PENDING REMEDIATION TABLE */}
      <div className="bg-white/90 rounded-2xl border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4.5 border-b border-stone-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-stone-900 text-sm tracking-tight">
              Pending Remediation (7-Day Window)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Remote branches idle past stale threshold flagged for automated cleanup
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#6B7A2A]/10 text-[#4A5519] text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              {branches.length} flagged branches
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* Table Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branch name or author..."
                aria-label="Filter branches by name or author"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Repo Selector */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span>Repo:</span>
                <select
                  value={selectedRepoFilter}
                  onChange={(e) => setSelectedRepoFilter(e.target.value)}
                  aria-label="Filter by repository"
                  className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 cursor-pointer"
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name}
                    </option>
                  ))}
                </select>

                {onScanRepository && (
                  <button
                    type="button"
                    onClick={() => {
                      const input = window.prompt('Enter GitHub repository in owner/repo format (e.g. octocat/Spoon-Knife):');
                      if (input && input.trim()) {
                        onScanRepository(input.trim());
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#6B7A2A]/10 text-[#4A5519] hover:bg-[#6B7A2A]/20 transition-colors cursor-pointer"
                    title="Scan any GitHub repository for stale branches"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Scan Repo</span>
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort table rows"
                  className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 cursor-pointer"
                >
                  <option value="timeLeft">Time Left (Urgency)</option>
                  <option value="staleness">Staleness (Days)</option>
                  <option value="branchName">Branch Name</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table / Empty State */}
          {branches.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50">
              <div className="w-10 h-10 rounded-full bg-[#6B7A2A]/10 text-[#4A5519] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-stone-800">
                No branches pending remediation
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                All tracked repositories meet current hygiene standards, or all active branches are covered by safety guardrails.
              </p>
              {(searchQuery || selectedRepoFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRepoFilter('all');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50/80 text-[11px] font-semibold text-stone-500 uppercase tracking-wider border-y border-stone-200/80">
                  <tr>
                    <th scope="col" className="py-3 px-6">Repository</th>
                    <th scope="col" className="py-3 px-4">Branch Name</th>
                    <th scope="col" className="py-3 px-4">Author</th>
                    <th scope="col" className="py-3 px-4">Staleness</th>
                    <th scope="col" className="py-3 px-4">Time Left</th>
                    <th scope="col" className="py-3 px-6 text-right">Remediation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <AnimatePresence>
                    {branches.map((b) => {
                      const isCritical = b.hoursLeft < 48;
                      let stalenessColor = 'bg-amber-50 text-amber-800 border-amber-200/90';
                      if (b.daysStale >= 120) {
                        stalenessColor = 'bg-rose-50 text-rose-800 border-rose-200/90';
                      } else if (b.daysStale >= 60) {
                        stalenessColor = 'bg-orange-50 text-orange-800 border-orange-200/90';
                      }

                      return (
                        <motion.tr
                          key={b.id}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-[#6B7A2A]/[0.02] transition-colors"
                        >
                          {/* Repo */}
                          <td className="py-3.5 px-6 font-mono text-[11px] text-stone-600 font-medium">
                            {b.repo}
                          </td>

                          {/* Branch Name */}
                          <td className="py-3.5 px-4 font-mono font-medium text-stone-900">
                            <span className="flex items-center gap-1.5">
                              <GitBranch className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              <span className="truncate max-w-[220px]">{b.branchName}</span>
                            </span>
                          </td>

                          {/* Author */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[9px] border border-stone-300">
                                {b.authorInitials}
                              </div>
                              <span className="text-stone-700 font-medium">{b.author}</span>
                            </div>
                          </td>

                          {/* Staleness Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono tracking-tight border font-medium ${stalenessColor}`}
                            >
                              {b.daysStale}d idle
                            </span>
                          </td>

                          {/* Time Left */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-mono text-xs font-semibold tabular-nums ${
                                isCritical ? 'text-rose-600' : 'text-stone-600'
                              }`}
                            >
                              {formatTimeRemaining(b.hoursLeft)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Notify Button */}
                              <button
                                type="button"
                                onClick={() => onNotifySlack(b)}
                                aria-label={`Notify author on Slack about ${b.branchName}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Notify</span>
                              </button>

                              {/* Keep Branch */}
                              <button
                                type="button"
                                onClick={() => onKeepBranch(b)}
                                aria-label={`Keep branch ${b.branchName}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/90 rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                <BookmarkCheck className="w-3.5 h-3.5 text-[#6B7A2A]" />
                                Keep
                              </button>

                              {/* Prune Now */}
                              <button
                                type="button"
                                onClick={() => onOpenPruneModal(b)}
                                aria-label={`Prune branch ${b.branchName}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Prune Now</span>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: RECENT ACTIVITY & RECOVERY LOG */}
      <div className="bg-white/90 rounded-2xl border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4.5 border-b border-stone-100/90 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-stone-900 text-sm tracking-tight">
              Recent Activity & Recovery Log
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Immutable commit archive records of pruned refs. Restorable in 1-click.
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400">Zero-Loss Tag Enclave</span>
        </div>

        <div className="p-6">
          {activity.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500">
              No recently pruned branches in recovery buffer.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50/80 text-[11px] font-semibold text-stone-500 uppercase tracking-wider border-y border-stone-200/80">
                  <tr>
                    <th scope="col" className="py-3 px-6">Repository</th>
                    <th scope="col" className="py-3 px-4">Pruned Branch Ref</th>
                    <th scope="col" className="py-3 px-4">Archived Commit Hash</th>
                    <th scope="col" className="py-3 px-4">Pruned When</th>
                    <th scope="col" className="py-3 px-6 text-right">Recovery Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <AnimatePresence>
                    {activity.map((act) => (
                      <motion.tr
                        key={act.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="hover:bg-stone-50/50 transition-colors"
                      >
                        <td className="py-3 px-6 font-mono text-[11px] text-stone-600">
                          {act.repo}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {act.status === 'restored' ? (
                            <span className="inline-flex items-center gap-2 text-stone-900 font-semibold">
                              <span>{act.branchName}</span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Restored
                              </span>
                            </span>
                          ) : (
                            <span className="text-stone-800 line-through opacity-75">
                              {act.branchName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700 font-semibold tabular-nums">
                            {act.commitHash}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                          {act.prunedWhen}
                        </td>
                        <td className="py-3 px-6 text-right">
                          {act.status === 'restored' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs select-none">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Restored
                            </span>
                          ) : restoringId === act.id ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 text-stone-500 border border-stone-200 cursor-wait select-none"
                            >
                              <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#6B7A2A]" />
                              Restoring...
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRestoreBranch(act)}
                              aria-label={`1-Click restore branch ${act.branchName}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-stone-800 hover:bg-[#6B7A2A] hover:text-white border border-stone-200/90 shadow-xs transition-all duration-150 cursor-pointer group"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#6B7A2A] group-hover:text-white transition-colors" />
                              1-Click Restore
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
