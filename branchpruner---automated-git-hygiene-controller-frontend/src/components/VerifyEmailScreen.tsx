import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GitBranch, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface VerifyEmailScreenProps {
  onNavigateToLogin: () => void;
  onBackToSplash: () => void;
}

export const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({
  onNavigateToLogin,
  onBackToSplash
}) => {
  const { verifyEmail, resendVerification } = useAuth();

  const [token, setToken] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      runVerification(tokenParam);
    }
  }, []);

  const runVerification = async (verifyToken: string) => {
    setStatus('verifying');
    setMessage('');
    try {
      const res = await verifyEmail(verifyToken);
      setStatus('success');
      setMessage(res.message || 'Email verified successfully! You can now access your account.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Verification token is invalid or has expired.');
    }
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      runVerification(token.trim());
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendSuccess('');
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendSuccess(res.message || 'If an unverified account exists, a new link has been dispatched.');
    } catch (err: any) {
      setMessage(err.message || 'Could not dispatch verification email.');
    } finally {
      setIsResending(false);
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
        {status === 'verifying' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-[#6B7A2A] animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-stone-900">Verifying Your Email</h2>
            <p className="text-xs text-stone-500 mt-1">Confirming single-use cryptographic token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Email Verified!</h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">{message}</p>
            <button
              onClick={onNavigateToLogin}
              className="mt-6 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-all cursor-pointer shadow-sm"
            >
              Sign In to Console
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-2">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-center text-stone-900">Verification Link Expired</h2>
            <p className="text-xs text-stone-600 text-center mt-1.5 leading-relaxed">{message}</p>

            {resendSuccess ? (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center">
                {resendSuccess}
              </div>
            ) : (
              <form onSubmit={handleResend} className="mt-5 space-y-3">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Request New Verification Link
                </label>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]"
                  required
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isResending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isResending ? 'Sending...' : 'Dispatch New Verification Link'}
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-[#4A5519] hover:underline font-semibold cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#6B7A2A]/10 text-[#6B7A2A] flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-center text-stone-900">Email Verification</h2>
            <p className="text-xs text-stone-500 text-center mt-1.5 leading-relaxed">
              Enter the verification token provided in your activation email:
            </p>

            <form onSubmit={handleManualVerify} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Verification Token
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

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-all cursor-pointer"
              >
                Verify & Activate
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
          </div>
        )}
      </motion.div>
    </div>
  );
};
