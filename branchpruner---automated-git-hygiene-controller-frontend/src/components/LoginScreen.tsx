import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GitBranch, Eye, EyeOff, ShieldCheck, ArrowLeft, AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface LoginScreenProps {
  onLoginSuccess: (authInfo: { email: string; method: string }) => void;
  onBackToSplash: () => void;
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onBackToSplash,
  onNavigateToSignUp,
  onNavigateToForgotPassword
}) => {
  const { login, resendVerification } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unverified email state
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = 'Work email address is required';
    } else if (!emailRegex.test(email)) {
      errs.email = 'Please provide a valid work email format';
    }

    if (!password) {
      errs.password = 'Password is required to authenticate';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    return errs;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      setServerError('');
      setIsUnverified(false);
      setResendStatus('');
      try {
        await login({ email: email.trim(), password });
        onLoginSuccess({ email: email.trim(), method: 'email' });
      } catch (err: any) {
        if (err.code === 'EMAIL_NOT_VERIFIED' || err.status === 403) {
          setIsUnverified(true);
          setServerError(err.message || 'Your email address has not been verified yet.');
        } else {
          setServerError(err.message || 'Authentication failed. Please verify credentials.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    setResendStatus('');
    try {
      const res = await resendVerification(email.trim());
      setResendStatus(res.message || 'A new verification link has been sent to your inbox.');
    } catch (err: any) {
      setResendStatus(err.message || 'Could not send verification email. Please try again.');
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

      {/* Subtle glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#6B7A2A]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand header */}
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
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Sign in to Console
          </h1>
          <p className="text-xs text-stone-500 mt-1.5">
            Automated remote hygiene and snapshot archive control
          </p>
        </div>

        {/* Unverified Email Warning State */}
        {isUnverified && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-start gap-2.5">
              <MailCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-amber-950">Email verification required</p>
                <p className="text-amber-800 leading-relaxed">
                  {serverError}
                </p>
                {resendStatus ? (
                  <p className="font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    {resendStatus}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResendVerification}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isResending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {serverError && !isUnverified && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1"
            >
              Work Email
            </label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                aria-invalid={Boolean(touched.email && errors.email)}
                placeholder="name@company.com"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                  touched.email && errors.email
                    ? 'border-rose-400 focus:ring-rose-400/40'
                    : 'border-stone-200 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]'
                }`}
              />
            </div>
            {touched.email && errors.email && (
              <p id="email-error" className="mt-1 text-xs text-rose-600 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password-input"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                aria-invalid={Boolean(touched.password && errors.password)}
                placeholder="••••••••••••"
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-white border text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                  touched.password && errors.password
                    ? 'border-rose-400 focus:ring-rose-400/40'
                    : 'border-stone-200 focus:ring-[#6B7A2A]/40 focus:border-[#6B7A2A]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p id="password-error" className="mt-1 text-xs text-rose-600 font-medium">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B7A2A] hover:bg-[#4A5519] focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/50 shadow-sm border border-[#4A5519]/20 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>

          <div className="flex items-center justify-center pt-1.5 pb-0.5">
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-xs text-stone-500 hover:text-[#4A5519] font-medium transition-colors hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        </form>

        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <span className="relative bg-white px-3 text-[11px] font-mono uppercase tracking-wider text-stone-400 rounded-full">
            OR SINGLE SIGN-ON
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2.5">
          <a
            href="/api/auth/github"
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium text-white bg-[#24292F] hover:bg-black border border-black/30 focus:outline-none focus:ring-2 focus:ring-stone-600 shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Continue with GitHub Organization
          </a>

          <a
            href="/api/auth/google"
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/90 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A2A]/30 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27a7.22 7.22 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            Continue with Google Workspace
          </a>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6B7A2A]" />
            SOC2 Type II Enclave
          </span>
          <button
            type="button"
            onClick={onNavigateToSignUp}
            className="text-xs text-[#4A5519] hover:underline font-semibold cursor-pointer"
          >
            Don't have an account? Sign Up →
          </button>
        </div>
      </motion.div>

      {/* Footer disclaimer */}
      <div className="mt-7 text-center text-xs text-stone-400 max-w-sm">
        Branches are tracked with zero-loss cryptographic snapshots prior to any remote ref prunes.
      </div>
    </div>
  );
};
