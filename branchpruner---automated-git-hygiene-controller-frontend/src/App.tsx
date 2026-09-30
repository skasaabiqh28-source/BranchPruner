/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SplashScreen } from './components/SplashScreen.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { SignUpScreen } from './components/SignUpScreen.tsx';
import { VerifyEmailScreen } from './components/VerifyEmailScreen.tsx';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen.tsx';
import { ResetPasswordScreen } from './components/ResetPasswordScreen.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Loader2 } from 'lucide-react';

type Screen =
  | 'splash'
  | 'login'
  | 'signup'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'dashboard';

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const path = window.location.pathname;
    if (path.includes('/verify-email')) return 'verify-email';
    if (path.includes('/reset-password')) return 'reset-password';
    if (path.includes('/forgot-password')) return 'forgot-password';
    if (path.includes('/signup')) return 'signup';
    if (path.includes('/login')) return 'login';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'splash';
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      }
    };
  }, []);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/verify-email')) setCurrentScreen('verify-email');
      else if (path.includes('/reset-password')) setCurrentScreen('reset-password');
      else if (path.includes('/forgot-password')) setCurrentScreen('forgot-password');
      else if (path.includes('/signup')) setCurrentScreen('signup');
      else if (path.includes('/login')) setCurrentScreen('login');
      else if (path.includes('/dashboard')) setCurrentScreen('dashboard');
      else setCurrentScreen('splash');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Protected route guard: Redirect unauthenticated users away from dashboard
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && currentScreen === 'dashboard') {
        setCurrentScreen('login');
        window.history.pushState({}, '', '/login');
      } else if (isAuthenticated && (currentScreen === 'splash' || currentScreen === 'login')) {
        setCurrentScreen('dashboard');
        window.history.pushState({}, '', '/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, currentScreen]);

  const navigateTo = (screen: Screen, path: string) => {
    setCurrentScreen(screen);
    window.history.pushState({}, '', path);
  };

  const handleSignOut = async () => {
    await logout();
    navigateTo('login', '/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6B7A2A] animate-spin mb-3" />
        <p className="text-xs font-mono uppercase tracking-wider text-stone-500">
          Restoring Session...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] font-sans selection:bg-[#6B7A2A]/30 selection:text-[#3B4415]">
      <AnimatePresence mode="wait">
        {/* SCREEN 1: SPLASH SCREEN */}
        {currentScreen === 'splash' && (
          <SplashScreen
            key="splash-screen"
            onContinue={() => navigateTo('login', '/login')}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}

        {/* SCREEN 2: LOGIN */}
        {currentScreen === 'login' && (
          <motion.div
            key="login-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <LoginScreen
              onLoginSuccess={() => navigateTo('dashboard', '/dashboard')}
              onBackToSplash={() => navigateTo('splash', '/')}
              onNavigateToSignUp={() => navigateTo('signup', '/signup')}
              onNavigateToForgotPassword={() => navigateTo('forgot-password', '/forgot-password')}
            />
          </motion.div>
        )}

        {/* SCREEN 3: SIGN UP */}
        {currentScreen === 'signup' && (
          <motion.div
            key="signup-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <SignUpScreen
              onNavigateToLogin={() => navigateTo('login', '/login')}
              onBackToSplash={() => navigateTo('splash', '/')}
            />
          </motion.div>
        )}

        {/* SCREEN 4: VERIFY EMAIL */}
        {currentScreen === 'verify-email' && (
          <motion.div
            key="verify-email-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <VerifyEmailScreen
              onNavigateToLogin={() => navigateTo('login', '/login')}
              onBackToSplash={() => navigateTo('splash', '/')}
            />
          </motion.div>
        )}

        {/* SCREEN 5: FORGOT PASSWORD */}
        {currentScreen === 'forgot-password' && (
          <motion.div
            key="forgot-password-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ForgotPasswordScreen
              onNavigateToLogin={() => navigateTo('login', '/login')}
              onBackToSplash={() => navigateTo('splash', '/')}
            />
          </motion.div>
        )}

        {/* SCREEN 6: RESET PASSWORD */}
        {currentScreen === 'reset-password' && (
          <motion.div
            key="reset-password-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ResetPasswordScreen
              onNavigateToLogin={() => navigateTo('login', '/login')}
              onBackToSplash={() => navigateTo('splash', '/')}
            />
          </motion.div>
        )}

        {/* SCREEN 7: PROTECTED DASHBOARD */}
        {currentScreen === 'dashboard' && user && (
          <motion.div
            key="dashboard-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Dashboard
              user={user}
              onSignOut={handleSignOut}
              onNavigateToSplash={() => navigateTo('splash', '/')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
