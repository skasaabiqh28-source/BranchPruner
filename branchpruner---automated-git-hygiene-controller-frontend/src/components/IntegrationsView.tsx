import React, { useState } from 'react';
import { IntegrationsState } from '../types.ts';
import { MessageSquare, Check, Power, Send, Key, User, FolderGit2, Bot, X } from 'lucide-react';
import { Modal } from './Modal.tsx';

interface IntegrationsViewProps {
  integrations: IntegrationsState;
  onToggleGithub: (options?: { token?: string; username?: string; repoFullName?: string }) => void;
  onToggleGitlab: () => void;
  onToggleSlack: () => void;
  onUpdateSlackChannel: (channel: string) => void;
  onSendTestSlack: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  integrations,
  onToggleGithub,
  onToggleGitlab,
  onToggleSlack,
  onUpdateSlackChannel,
  onSendTestSlack
}) => {
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [connectTab, setConnectTab] = useState<'token' | 'username' | 'repo' | 'mock'>('token');
  const [tokenInput, setTokenInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [repoInput, setRepoInput] = useState('');

  const handleGithubConnectSubmit = () => {
    setShowGithubModal(false);
    if (connectTab === 'token' && tokenInput.trim()) {
      onToggleGithub({ token: tokenInput.trim() });
    } else if (connectTab === 'username' && usernameInput.trim()) {
      onToggleGithub({ username: usernameInput.trim() });
    } else if (connectTab === 'repo' && repoInput.trim()) {
      onToggleGithub({ repoFullName: repoInput.trim() });
    } else {
      onToggleGithub();
    }
  };

  return (
    <div className="space-y-6">
      {/* GITHUB CONNECT MODAL */}
      <Modal
        isOpen={showGithubModal}
        onClose={() => setShowGithubModal(false)}
        title="Connect GitHub Account or Repository"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowGithubModal(false)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGithubConnectSubmit}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-[#6B7A2A] hover:bg-[#4A5519] cursor-pointer transition-colors shadow-xs"
            >
              Connect & Scan Branches
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-500">
            Connect your original GitHub account to discover real remote branches and calculate actual commit inactivity.
          </p>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-stone-100 p-1 gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setConnectTab('token')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                connectTab === 'token'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Personal Token
            </button>
            <button
              type="button"
              onClick={() => setConnectTab('username')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                connectTab === 'username'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Username / Org
            </button>
            <button
              type="button"
              onClick={() => setConnectTab('repo')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                connectTab === 'repo'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Single Repo
            </button>
            <button
              type="button"
              onClick={() => setConnectTab('mock')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                connectTab === 'mock'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mock Demo
            </button>
          </div>

          {connectTab === 'token' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 font-mono placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40"
              />
              <p className="text-[11px] text-stone-500">
                Generate a token at <span className="font-mono text-stone-700">github.com/settings/tokens</span> with <span className="font-mono text-stone-700">repo</span> scope. Encrypted at rest using AES-256-GCM.
              </p>
            </div>
          )}

          {connectTab === 'username' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                GitHub Username or Organization
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. octocat or your GitHub username"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40"
              />
              <p className="text-[11px] text-stone-500">
                Scans public repositories without requiring credentials.
              </p>
            </div>
          )}

          {connectTab === 'repo' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                GitHub Repository (owner/repo)
              </label>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="e.g. octocat/Spoon-Knife"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 font-mono placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40"
              />
              <p className="text-[11px] text-stone-500">
                Immediately indexes branches and analyzes commit timestamps for this repository.
              </p>
            </div>
          )}

          {connectTab === 'mock' && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
              Connects using the simulated Enterprise Bot Service with seeded repositories and realistic branch lifecycles.
            </div>
          )}
        </div>
      </Modal>

      <div>
        <h3 className="text-base font-bold text-stone-900 tracking-tight">
          VCS Providers & Webhooks
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          Manage repository access credentials and automated engineer notification webhooks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GITHUB CARD */}
        <div className="bg-white/90 rounded-2xl border border-stone-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#24292F] text-white flex items-center justify-center">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  integrations.github.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    integrations.github.connected ? 'bg-emerald-500' : 'bg-stone-400'
                  }`}
                />
                {integrations.github.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <h4 className="font-bold text-base text-stone-900">GitHub Organization</h4>
            <p className="text-xs text-stone-500 mt-1">
              Prune remote branches and sync repositories across your GitHub account.
            </p>

            {integrations.github.connected && (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span className="text-stone-400">Connected As:</span>
                  <span className="font-mono font-medium text-stone-800">{integrations.github.user}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Account Type:</span>
                  <span>{integrations.github.accountType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Last Synced:</span>
                  <span>{integrations.github.lastSynced}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                if (integrations.github.connected) {
                  onToggleGithub();
                } else {
                  setShowGithubModal(true);
                }
              }}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                integrations.github.connected
                  ? 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                  : 'bg-[#6B7A2A] text-white hover:bg-[#4A5519] border-transparent'
              }`}
            >
              {integrations.github.connected ? 'Disconnect GitHub' : 'Connect GitHub Account'}
            </button>
          </div>
        </div>

        {/* GITLAB CARD */}
        <div className="bg-white/90 rounded-2xl border border-stone-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FC6D26] text-white flex items-center justify-center font-bold text-sm">
                GL
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  integrations.gitlab.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    integrations.gitlab.connected ? 'bg-emerald-500' : 'bg-stone-400'
                  }`}
                />
                {integrations.gitlab.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <h4 className="font-bold text-base text-stone-900">GitLab Instance</h4>
            <p className="text-xs text-stone-500 mt-1">
              Connect self-hosted GitLab CE/EE or SaaS instances for automated merge request branch pruning.
            </p>

            {integrations.gitlab.connected ? (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span className="text-stone-400">Account:</span>
                  <span className="font-mono font-medium text-stone-800">{integrations.gitlab.user}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Last Synced:</span>
                  <span>{integrations.gitlab.lastSynced}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-400">
                Supports group access tokens and instance-level webhook receivers.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onToggleGitlab}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                integrations.gitlab.connected
                  ? 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                  : 'bg-[#6B7A2A] text-white hover:bg-[#4A5519] border-transparent'
              }`}
            >
              {integrations.gitlab.connected ? 'Disconnect GitLab' : 'Connect GitLab'}
            </button>
          </div>
        </div>

        {/* SLACK CARD */}
        <div className="bg-white/90 rounded-2xl border border-stone-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#4A154B] text-white flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  integrations.slack.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    integrations.slack.connected ? 'bg-emerald-500' : 'bg-stone-400'
                  }`}
                />
                {integrations.slack.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <h4 className="font-bold text-base text-stone-900">Slack Webhooks</h4>
            <p className="text-xs text-stone-500 mt-1">
              Dispatch stale branch grace period notifications directly to developer channels.
            </p>

            {integrations.slack.connected && (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-3 text-xs text-stone-600">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Bot user:</span>
                  <span className="font-mono font-medium text-stone-800">{integrations.slack.user}</span>
                </div>

                {/* Channel Selector */}
                <div>
                  <label
                    htmlFor="slack-channel-select"
                    className="block text-[11px] text-stone-500 font-semibold mb-1 uppercase tracking-wider"
                  >
                    Notification Channel Target:
                  </label>
                  <select
                    id="slack-channel-select"
                    value={integrations.slack.channel}
                    onChange={(e) => onUpdateSlackChannel(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:ring-2 focus:ring-[#6B7A2A]/40 cursor-pointer"
                  >
                    {integrations.slack.availableChannels?.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Send Test Dispatch Button */}
                <button
                  type="button"
                  onClick={onSendTestSlack}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#4A5519] bg-[#6B7A2A]/10 hover:bg-[#6B7A2A]/20 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Test Notification to {integrations.slack.channel}
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onToggleSlack}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                integrations.slack.connected
                  ? 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                  : 'bg-[#6B7A2A] text-white hover:bg-[#4A5519] border-transparent'
              }`}
            >
              {integrations.slack.connected ? 'Disconnect Slack' : 'Connect Slack'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
