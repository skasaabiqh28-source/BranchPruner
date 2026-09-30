import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Plus, X, Info, Sliders, CheckCircle2 } from 'lucide-react';

interface RulesViewProps {
  protectedPatterns: string[];
  staleThresholdDays: number;
  onAddPattern: (pattern: string) => boolean | Promise<boolean>;
  onRemovePattern: (pattern: string) => void;
  onChangeStaleThreshold: (days: number) => void;
  onSimulateEvaluation: () => void;
}

export const RulesView: React.FC<RulesViewProps> = ({
  protectedPatterns,
  staleThresholdDays,
  onAddPattern,
  onRemovePattern,
  onChangeStaleThreshold,
  onSimulateEvaluation
}) => {
  const [newPatternInput, setNewPatternInput] = useState('');
  const [patternError, setPatternError] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPatternInput.trim();
    if (!trimmed) {
      setPatternError('Pattern cannot be blank');
      return;
    }
    const success = await onAddPattern(trimmed);
    if (success) {
      setNewPatternInput('');
      setPatternError('');
    } else {
      setPatternError('Pattern already exists in guardrails');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-stone-900 tracking-tight">
          Safety Rules & Guardrails
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          Configure protected branch pattern invariants and inactivity threshold criteria.
        </p>
      </div>

      {/* PROTECTED PATTERNS CARD */}
      <div className="bg-white/90 rounded-2xl border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <h4 className="font-semibold text-stone-900 text-sm tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6B7A2A]" />
              Protected Branch Patterns (Wildcard Guardrails)
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Remote branches matching these wildcard patterns will NEVER be pruned or queued for remediation.
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 self-start sm:self-auto">
            {protectedPatterns.length} Active Rules
          </span>
        </div>

        {/* Add Pattern Form */}
        <form onSubmit={handleFormSubmit} className="max-w-md mt-5 mb-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPatternInput}
              onChange={(e) => {
                setNewPatternInput(e.target.value);
                if (patternError) setPatternError('');
              }}
              placeholder="e.g. release/* or staging/*"
              aria-label="New protected branch wildcard pattern"
              className={`flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
                patternError
                  ? 'border-rose-400 focus:ring-rose-400/30'
                  : 'border-stone-200 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]'
              }`}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Pattern
            </button>
          </div>
          {patternError && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{patternError}</p>
          )}
          <p className="mt-2 text-[11px] text-stone-400">
            Supports wildcard glob asterisks: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">release/*</code>, <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">hotfix/*</code>, <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">prod-*</code>
          </p>
        </form>

        {/* Active Chips List */}
        <div className="flex flex-wrap gap-2 pt-2">
          <AnimatePresence>
            {protectedPatterns.map((pat) => {
              const isLocked = pat === 'main' || pat === 'master';
              return (
                <motion.span
                  key={pat}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6B7A2A]/10 border border-[#6B7A2A]/20 text-[#3B4415] text-xs font-mono font-medium shadow-xs"
                >
                  <Shield className="w-3 h-3 text-[#6B7A2A]" />
                  {pat}
                  {isLocked ? (
                    <span className="text-[10px] text-stone-400 uppercase font-sans font-bold ml-1">
                      (Core)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemovePattern(pat)}
                      aria-label={`Remove protected pattern ${pat}`}
                      className="text-[#4A5519]/70 hover:text-rose-600 ml-1 rounded p-0.5 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* STALENESS THRESHOLD SLIDER */}
      <div className="bg-white/90 rounded-2xl border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6">
        <div className="pb-4 border-b border-stone-100">
          <h4 className="font-semibold text-stone-900 text-sm tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#6B7A2A]" />
            Staleness Inactivity Window
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Consecutive days without commits or active reviews before a remote branch enters the 7-day remediation grace period.
          </p>
        </div>

        <div className="max-w-xl space-y-5 mt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700">Flag branches inactive for:</span>
            <span className="font-mono font-bold text-[#3B4415] text-base bg-[#6B7A2A]/15 px-3 py-1 rounded-lg tabular-nums">
              {staleThresholdDays} Days
            </span>
          </div>

          <input
            type="range"
            min="14"
            max="180"
            step="1"
            value={staleThresholdDays}
            onChange={(e) => onChangeStaleThreshold(Number(e.target.value))}
            aria-label="Stale threshold in days"
            className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#6B7A2A] focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40"
          />

          <div className="flex justify-between text-[11px] text-stone-400 font-mono">
            <span>14d (Aggressive)</span>
            <span>30d (Standard)</span>
            <span>90d (Quarterly)</span>
            <span>180d (Relaxed)</span>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#6B7A2A] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-stone-800">Live Policy Impact:</p>
              <p className="mt-0.5 text-stone-600">
                Remote branches with no commit activity for <strong>{staleThresholdDays}+ days</strong> (and not matching protected patterns) will trigger alerts and enter the 7-day automated pruning window.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onSimulateEvaluation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#4A5519] bg-[#6B7A2A]/15 hover:bg-[#6B7A2A]/25 border border-[#6B7A2A]/30 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Evaluate Active Guardrails on All Repositories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
