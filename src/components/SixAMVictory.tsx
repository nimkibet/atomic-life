'use client';

import { useState, useEffect } from 'react';
import { isWithinTimeWindow, getTimeUntilNextWindow } from '@/lib/time-utils';

interface SixAMVictoryProps {
  meetingMode?: boolean;
  onVictory?: () => void;
}

/**
 * SixAMVictory Component
 * The main "I Won the Morning" button with strict time window constraints.
 * 
 * States:
 * - Active (Green, pulsating): Within 05:45 - 06:15 AM (or 07:15 - 07:45 AM if Meeting Mode)
 * - Missed (Grey): Outside the window
 * - Fallback (Amber): Meeting Mode active, within fallback window
 */
export default function SixAMVictory({ meetingMode = false, onVictory }: SixAMVictoryProps) {
  const [windowState, setWindowState] = useState<{
    inWindow: boolean;
    state: 'active' | 'missed' | 'fallback';
  }>({ inWindow: false, state: 'missed' });
  const [timeUntilNext, setTimeUntilNext] = useState<{
    hours: number;
    minutes: number;
    isTomorrow: boolean;
  } | null>(null);
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    // Check window state every 30 seconds
    const checkWindow = () => {
      const state = isWithinTimeWindow(meetingMode);
      setWindowState(state);
      setTimeUntilNext(getTimeUntilNextWindow(meetingMode));
    };

    checkWindow();
    const interval = setInterval(checkWindow, 30000);

    return () => clearInterval(interval);
  }, [meetingMode]);

  const handleVictory = () => {
    if (windowState.inWindow && !hasWon) {
      setHasWon(true);
      onVictory?.();
    }
  };

  // Base styles
  const baseStyles = `
    relative w-full max-w-md mx-auto py-8 px-6
    rounded-2xl font-bold text-xl tracking-wide
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-dark-bg
    disabled:cursor-not-allowed disabled:opacity-50
  `;

  // State-based styles
  const getStateStyles = () => {
    if (hasWon) {
      return `
        bg-accent-success text-dark-bg
        border-2 border-accent-success
        shadow-[0_0_20px_rgba(16,185,129,0.5)]
      `;
    }
    
    switch (windowState.state) {
      case 'active':
        return `
          bg-accent-success text-dark-bg
          border-2 border-accent-success
          shadow-[0_0_30px_rgba(16,185,129,0.6)]
          animate-pulse-slow hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.8)]
          cursor-pointer
        `;
      case 'fallback':
        return `
          bg-accent-warning text-dark-bg
          border-2 border-accent-warning
          shadow-[0_0_20px_rgba(245,158,11,0.5)]
          animate-pulse hover:scale-105
          cursor-pointer
        `;
      default:
        return `
          bg-dark-card text-gray-500
          border-2 border-dark-border
          cursor-not-allowed
        `;
    }
  };

  const getButtonText = () => {
    if (hasWon) return '✓ Victory Secured!';
    if (windowState.state === 'active') return 'I Won the Morning';
    if (windowState.state === 'fallback') return 'I Won the Morning (Fallback)';
    return 'Window Missed';
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <button
        onClick={handleVictory}
        disabled={!windowState.inWindow || hasWon}
        className={`${baseStyles} ${getStateStyles()}`}
      >
        {/* Glow effect for active state */}
        {windowState.state === 'active' && !hasWon && (
          <div className="absolute inset-0 rounded-2xl bg-accent-success opacity-20 animate-ping" />
        )}
        
        <span className="relative z-10">
          {getButtonText()}
        </span>
      </button>

      {/* Status message */}
      <div className="text-center mt-4">
        {windowState.state === 'missed' && timeUntilNext && (
          <p className="text-gray-400 text-sm">
            Next window in {timeUntilNext.hours}h {timeUntilNext.minutes}m
            {timeUntilNext.isTomorrow ? ' (tomorrow)' : ''}
          </p>
        )}
        {windowState.state === 'fallback' && (
          <p className="text-accent-warning text-sm">
            Meeting Mode: Extended window active
          </p>
        )}
        {hasWon && (
          <p className="text-accent-success text-sm">
            You've won today's morning! 🎉
          </p>
        )}
      </div>
    </div>
  );
}
