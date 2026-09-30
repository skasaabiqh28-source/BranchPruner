import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ToastMessage } from '../types.ts';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  onUndo: (toast: ToastMessage) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onUndo
}) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-md w-full"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-lg backdrop-blur-md ${
              toast.isDryRun
                ? 'bg-amber-950/95 text-amber-100 border-amber-700/60'
                : 'bg-stone-900/95 text-stone-100 border-stone-800'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-mono">
              {toast.isDryRun ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 text-[10px] font-sans font-bold uppercase tracking-wider border border-amber-500/30">
                  Dry-Run
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#6B7A2A] animate-pulse"></span>
              )}
              <span className="font-sans text-xs font-medium text-stone-200">
                {toast.message}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-4 shrink-0">
              {toast.undoAction && (
                <button
                  type="button"
                  onClick={() => onUndo(toast)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20 focus:ring-1 focus:ring-white cursor-pointer"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-md text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
