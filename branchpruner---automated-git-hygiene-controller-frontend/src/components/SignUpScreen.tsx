import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GitBranch, Eye, EyeOff, ArrowLeft, AlertCircle, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SignUpScreenProps {
  onNavigateToLogin: () => void;
  onBackToSplash: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigateToLogin,
  onBackToSplash
}) => {
  const { register, resendVerification } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string>('');
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setServerError('Please provide a valid work email format.');
      return;
    }
    if (password.length < 8) {
      setServerError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ email, password, name });
      setRegisteredEmail(email);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    setResendStatus('');
    try {
      const res = await resendVerification(registeredEmail);
      setResendStatus(res.message || 'Verification link re-sent.');
    } catch (err: any) {
      setResendStatus(err.message || 'Could not resend email.');
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

      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#6B7A2A]/10 rounded-full blur-3xl pointer-events-none" />

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
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl border border-stone-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.06)] p-7 sm:p-8 relative z-10"
      >
        {registeredEmail ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-[#6B7A2A]/10 text-[#6B7A2A] mx-auto flex items-center justify-center mb-4">
              <MailCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Check Your Inbox
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              We have dispatched a verification email to{' '}
              <strong className="text-stone-900 font-semibold">{registeredEmail}</strong>.
              Click the link in the message to activate your workspace.
            </p>

            {resendStatus && (
              <div className="my-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-medium">
                {resendStatus}
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] transition-all cursor-pointer shadow-sm"
              >
                Proceed to Sign In
              </button>
              <button
                type="button"
                disabled={isResending}
                onClick={handleResend}
                className="w-full py-2 px-3 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors cursor-pointer"
              >
                {isResending ? 'Sending...' : "Didn't receive email? Resend"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Create Account
              </h1>
              <p className="text-xs text-stone-500 mt-1.5">
                Set up your automated git hygiene controller
              </p>
            </div>

            {serverError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="DevOps Lead"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]"
                />
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  Confirm Password
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
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/50 shadow-sm border border-[#4A5519]/20 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>

            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-mono uppercase tracking-wider text-stone-400 rounded-full">
                OR SIGN UP WITH
              </span>
            </div>

            <div className="space-y-2.5">
              <a
                href="/api/auth/github"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium text-white bg-[#24292F] hover:bg-black border border-black/30 shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                Sign up with GitHub Organization
              </a>

              <a
                href="/api/auth/google"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/90 shadow-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27a7.22 7.22 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                Sign up with Google Workspace
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6B7A2A]" />
                SOC2 Type II Enclave
              </span>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-[#4A5519] hover:underline font-semibold cursor-pointer"
              >
                Already have an account? Sign In →
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
