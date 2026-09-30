import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GitBranch, KeyRound, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ResetPasswordScreenProps {
  onNavigateToLogin: () => void;
  onBackToSplash: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onNavigateToLogin,
  onBackToSplash
}) => {
  const { resetPassword } = useAuth();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token.trim()) {
      setErrorMessage('Reset token is required.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token: token.trim(), newPassword });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. The link may have expired.');
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
        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Password Reset Complete</h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Your password has been securely updated with Argon2id. You can now log in with your new credentials.
            </p>
            <button
              onClick={onNavigateToLogin}
              className="mt-6 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-all cursor-pointer shadow-sm"
            >
              Sign In to Console
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#6B7A2A]/10 text-[#6B7A2A] flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Choose New Password
              </h1>
              <p className="text-xs text-stone-500 mt-1.5">
                Set a strong password of at least 8 characters
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!new URLSearchParams(window.location.search).get('token') && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste single-use token"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-stone-200 font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
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
                {isSubmitting ? 'Updating Password...' : 'Save New Password & Continue'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-[#4A5519] hover:underline font-semibold cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
