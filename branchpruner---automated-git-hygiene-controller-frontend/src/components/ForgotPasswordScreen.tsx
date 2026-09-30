import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GitBranch, KeyRound, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
  onBackToSplash: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
  onBackToSplash
}) => {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      setFeedbackMessage(res.message || 'If an account exists with this email, password reset instructions have been sent.');
      setIsSubmitted(true);
    } catch {
      setFeedbackMessage('If an account exists with this email, password reset instructions have been sent.');
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center items-center p-6 bg-dotted-olive relative">
      <button
        onClick={onBackToSplash}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-mono text-stone-600 hover:text-stone-900 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-stone-200/90 shadow-xs transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Return to Introduction
      </button>

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#6B7A2A] text-white flex items-center justify-center font-bold text-lg shadow-sm border border-[#4A5519]/30">
          <GitBranch className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-2xl tracking-tight text-[#3B4415]">
            BranchPruner
          </span>
          <span className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
            Automated Git Hygiene
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl border border-stone-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.06)] p-7 sm:p-8 relative z-10"
      >
        {isSubmitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Check Your Inbox</h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {feedbackMessage}
            </p>
            <button
              onClick={onNavigateToLogin}
              className="mt-6 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-all cursor-pointer shadow-sm"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#6B7A2A]/10 text-[#6B7A2A] flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Forgot Password?
              </h1>
              <p className="text-xs text-stone-500 mt-1.5">
                Enter your work email address to receive password reset instructions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/50 shadow-sm border border-[#4A5519]/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Sending Request...' : 'Send Password Reset Link'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-[#4A5519] hover:underline font-semibold cursor-pointer"
              >
                Remember your password? Sign In →
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
