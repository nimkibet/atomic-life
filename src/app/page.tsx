'use client';

import { useState } from 'react';
import IdentityHeader from '@/components/IdentityHeader';
import SixAMVictory from '@/components/SixAMVictory';
import ReadingLog from '@/components/ReadingLog';
import ProgressGrid from '@/components/ProgressGrid';
import HabitStacks from '@/components/HabitStacks';
import DayFlow from '@/components/DayFlow';
import DailyDetailModal from '@/components/DailyDetailModal';
import { USER_NAME } from '@/lib/supabase';

/**
 * Main Dashboard Page for Atomic Life
 * Single Player Mode with HARDCODED_USER_ID for "Nimrod"
 */
export default function Dashboard() {
  // Meeting Mode state - persisted to localStorage in production
  const [meetingMode, setMeetingMode] = useState(false);
  const [sixAMWon, setSixAMWon] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleMeetingModeToggle = () => {
    setMeetingMode(!meetingMode);
  };

  const handleVictory = () => {
    setSixAMWon(true);
    // In production, this would sync with Supabase
    console.log('Morning victory logged at:', new Date().toISOString());
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  return (
    <main className="min-h-screen bg-dark-bg text-white pb-12">
      {/* Identity Header - Dynamic Greeting with Nimrod's name */}
      <IdentityHeader name={USER_NAME} />

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8">
        
        {/* 6 AM Victory Module */}
        <section>
          <h2 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-wider">
            Morning Victory
          </h2>
          <SixAMVictory 
            meetingMode={meetingMode}
            onVictory={handleVictory}
          />
        </section>

        {/* Meeting Mode Toggle */}
        <section>
          <div className="bg-dark-card rounded-xl border border-dark-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Meeting Mode</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Late night meeting? Enable to extend your morning window by 90 minutes.
                </p>
              </div>
              <button
                onClick={handleMeetingModeToggle}
                className={`
                  relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-accent-info focus:ring-offset-2 focus:ring-offset-dark-bg
                `}
                style={{
                  backgroundColor: meetingMode ? '#3b82f6' : '#252535'
                }}
                aria-pressed={meetingMode}
              >
                <span
                  className={`
                    inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-200 shadow-lg
                    ${meetingMode ? 'translate-x-11' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
            {meetingMode && (
              <div className="mt-3 p-3 bg-accent-info/10 border border-accent-info/20 rounded-lg">
                <p className="text-sm text-accent-info">
                  ✓ Morning window extended to 07:15 AM - 07:45 AM
                </p>
                <p className="text-sm text-accent-info mt-1">
                  ✓ Evening shutdown penalty disabled for today
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Day Flow - Time Blocking Planner */}
        <section>
          <DayFlow />
        </section>

        {/* Habit Stacks */}
        <section>
          <HabitStacks />
        </section>

        {/* Daily Learning - Reading Log */}
        <section>
          <ReadingLog />
        </section>

        {/* Visual Proof - Progress Grid (Clickable) */}
        <section>
          <ProgressGrid onSelectDate={handleSelectDate} />
        </section>

      </div>

      {/* Daily Detail Modal */}
      {selectedDate && (
        <DailyDetailModal
          date={selectedDate}
          onClose={handleCloseModal}
        />
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>Atomic Life - Build Better Habits, One Atom at a Time</p>
      </footer>

    </main>
  );
}
