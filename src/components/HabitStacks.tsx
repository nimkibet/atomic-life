'use client';

import { useState, useEffect } from 'react';
import { supabase, HARDCODED_USER_ID } from '@/lib/supabase';

interface HabitStacksProps {
  onUpdate?: () => void;
}

interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  morning_stack_complete: boolean;
  evening_stack_complete: boolean;
  meeting_mode: boolean;
}

/**
 * HabitStacks Component - Morning and Evening habit checkboxes
 * Uses HARDCODED_USER_ID for single player mode
 */
export default function HabitStacks({ onUpdate }: HabitStacksProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Morning habits checklist
  const morningHabits = [
    { id: 'face', label: 'Face Washed (The Jolt)', emoji: '💧' },
    { id: 'phone', label: 'Phone Plugged In (The Setup)', emoji: '📱' },
    { id: 'gym', label: '30m Gym/Exercise (The Body)', emoji: '💪' },
    { id: 'meditation', label: 'Meditation (The Mind)', emoji: '🧘' },
  ];

  // Evening habits checklist
  const eveningHabits = [
    { id: 'bible', label: 'Bible Read (The Spirit)', emoji: '📖' },
    { id: 'shutdown', label: '10 PM Laptop Shutdown (The Discipline)', emoji: '🔒' },
  ];

  // Calculate completion percentage for a stack
  const calculateProgress = (stackComplete: boolean | undefined): number => {
    return stackComplete ? 100 : 0;
  };

  // Calculate overall completion percentage
  const calculateOverallProgress = (): number => {
    const morningComplete = summary?.morning_stack_complete ? 50 : 0;
    const eveningComplete = summary?.evening_stack_complete ? 50 : 0;
    return morningComplete + eveningComplete;
  };

  // Fetch today's summary using HARDCODED_USER_ID
  const fetchTodaySummary = async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', HARDCODED_USER_ID)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching summary:', error);
      }

      if (data) {
        setSummary(data as DailySummary);
      } else {
        // No row exists, create one
        const { data: newSummary, error: insertError } = await supabase
          .from('daily_summaries')
          .upsert({
            user_id: HARDCODED_USER_ID,
            date: today,
            morning_stack_complete: false,
            evening_stack_complete: false,
            meeting_mode: false
          }, { onConflict: 'user_id,date' })
          .select()
          .single();

        if (insertError) {
          console.warn('Error creating summary:', insertError);
        } else if (newSummary) {
          setSummary(newSummary as DailySummary);
        }
      }
    } catch (err) {
      console.warn('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySummary();
  }, []);

  // Toggle a stack completion status
  const toggleStack = async (stackType: 'morning' | 'evening') => {
    if (isUpdating || !supabase) return;

    setIsUpdating(true);

    try {
      // Determine the new value based on current state
      const currentValue = stackType === 'morning'
        ? summary?.morning_stack_complete
        : summary?.evening_stack_complete;
      const newValue = !currentValue;

      const fieldName = stackType === 'morning' ? 'morning_stack_complete' : 'evening_stack_complete';

      // Optimistically update local state for instant feedback
      setSummary(prev => prev ? {
        ...prev,
        [fieldName]: newValue
      } : {
        id: '',
        user_id: HARDCODED_USER_ID,
        date: today,
        morning_stack_complete: stackType === 'morning' ? newValue : false,
        evening_stack_complete: stackType === 'evening' ? newValue : false,
        meeting_mode: false
      });

      // Upsert to database - ensures row exists before updating
      const { error } = await supabase
        .from('daily_summaries')
        .upsert({
          user_id: HARDCODED_USER_ID,
          date: today,
          id: summary?.id,
          [fieldName]: newValue
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) {
        console.error('Error updating stack:', error);
        // Revert to correct state by refetching
        await fetchTodaySummary();
      } else {
        onUpdate?.();
      }
    } catch (err) {
      console.error('Error updating stack:', err);
      await fetchTodaySummary();
    } finally {
      setIsUpdating(false);
    }
  };

  const overallProgress = calculateOverallProgress();
  const morningProgress = calculateProgress(summary?.morning_stack_complete);
  const eveningProgress = calculateProgress(summary?.evening_stack_complete);

  if (isLoading) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-400 uppercase tracking-wider">
          📋 Habit Stacks
        </h2>
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{overallProgress}%</span>
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-success to-emerald-400 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Meeting Mode Notice */}
      {summary?.meeting_mode && (
        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">🔵 Meeting Mode: Evening shutdown penalty disabled</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Morning Stack */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              🌅 Morning Stack
              {summary?.morning_stack_complete && (
                <span className="text-sm text-accent-success">✓ Complete</span>
              )}
            </h3>
            <span className="text-sm text-gray-400">{morningProgress}%</span>
          </div>
          <div className="space-y-3">
            {morningHabits.map((habit) => (
              <label
                key={habit.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200
                  ${summary?.morning_stack_complete
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={summary?.morning_stack_complete || false}
                  onChange={() => toggleStack('morning')}
                  disabled={isUpdating}
                  className="w-6 h-6 rounded border-gray-600 bg-gray-700 
                    text-accent-success focus:ring-accent-success focus:ring-offset-dark-bg cursor-pointer"
                />
                <span className="text-xl">{habit.emoji}</span>
                <span className={`text-white ${summary?.morning_stack_complete ? 'line-through opacity-60' : ''}`}>
                  {habit.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Evening Stack */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              🌙 Evening Stack
              {summary?.evening_stack_complete && (
                <span className="text-sm text-accent-success">✓ Complete</span>
              )}
            </h3>
            <span className="text-sm text-gray-400">{eveningProgress}%</span>
          </div>
          <div className="space-y-3">
            {eveningHabits.map((habit) => (
              <label
                key={habit.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200
                  ${summary?.evening_stack_complete
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={summary?.evening_stack_complete || false}
                  onChange={() => toggleStack('evening')}
                  disabled={isUpdating}
                  className="w-6 h-6 rounded border-gray-600 bg-gray-700 
                    text-accent-success focus:ring-accent-success focus:ring-offset-dark-bg cursor-pointer"
                />
                <span className="text-xl">{habit.emoji}</span>
                <span className={`text-white ${summary?.evening_stack_complete ? 'line-through opacity-60' : ''}`}>
                  {habit.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
