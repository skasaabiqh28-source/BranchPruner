import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onContinue: () => void;
  prefersReducedMotion?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onContinue,
  prefersReducedMotion = false
}) => {
  const fullTitle = 'BranchPruner';
  const [displayedText, setDisplayedText] = useState(prefersReducedMotion ? fullTitle : '');
  const [isTypingDone, setIsTypingDone] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(fullTitle);
      setIsTypingDone(true);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(fullTitle.slice(0, index));
      if (index >= fullTitle.length) {
        clearInterval(interval);
        setIsTypingDone(true);
      }
    }, 110);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Welcome to BranchPruner. Click anywhere or press Enter to continue to sign in."
      onClick={() => onContinue()}
      initial={{ y: 0, opacity: 1 }}
      exit={
        prefersReducedMotion
          ? { opacity: 0, transition: { duration: 0.3 } }
          : { y: '-100%', transition: { duration: 0.7, ease: [0.65, 0, 0.35, 1] } }
      }
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] text-white select-none cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/50"
    >
      {/* Warm Orange Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 48%, rgba(255, 106, 0, 0.18) 0%, rgba(10, 10, 10, 0.98) 64%)'
        }}
      />

      {/* Subtle DevOps Grid Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        {/* Pill Badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-stone-900/80 border border-stone-700/70 shadow-lg text-stone-300 text-xs font-mono tracking-widest uppercase backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse shadow-[0_0_8px_#FF6A00]"></span>
          AUTOMATED GIT HYGIENE CONTROLLER
        </div>

        {/* Hero Glowing Title */}
        <div className="flex items-center justify-center text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight font-sans">
          <span className="text-[#FF6A00] drop-shadow-[0_0_45px_rgba(255,106,0,0.45)]">
            {displayedText}
          </span>
          {!isTypingDone && (
            <span className="inline-block w-2 sm:w-2.5 h-14 sm:h-20 md:h-24 bg-[#FF6A00] ml-2 animate-blink shadow-[0_0_12px_#FF6A00]" />
          )}
        </div>

        {/* Subtitle Description */}
        <p className="mt-6 text-stone-300 sm:text-stone-300 text-sm sm:text-base md:text-lg max-w-xl font-sans leading-relaxed text-balance">
          Safeguard master repos, prune stale remote branches, and maintain continuous repository health.
        </p>

        {/* Prompt line */}
        <div className="h-10 mt-14 flex items-center justify-center">
          <p
            className={`text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase ${
              isTypingDone ? 'animate-pulse text-stone-300' : 'opacity-60'
            }`}
          >
            CLICK ANYWHERE OR PRESS ENTER TO CONTINUE...
          </p>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="absolute bottom-7 text-xs font-mono text-stone-500 flex items-center gap-4">
        <span>v2.4.0-stable</span>
        <span>•</span>
        <span>Zero-loss Snapshot Recovery</span>
      </div>
    </motion.div>
  );
};
