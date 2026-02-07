'use client';

import { useState, useEffect } from 'react';
import { supabase, upsertDailySummary, getTodaySummary } from '@/lib/supabase';

interface HabitStacksProps {
  onUpdate?: () => void;
}

interface DailySummary {
  id: string;
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

  // Fetch today's summary using HARDCODED_USER_ID
  const fetchTodaySummary = async () => {
    try {
      const { data, error } = await getTodaySummary(today);
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching summary:', error);
      }

      if (data) {
        setSummary(data);
      } else {
        // No row exists, create one
        const { data: newSummary, error: insertError } = await upsertDailySummary(today, {
          morning_stack_complete: false,
          evening_stack_complete: false,
          meeting_mode: false
        });
        
        if (insertError) {
          console.warn('Error creating summary:', insertError);
        } else if (newSummary) {
          setSummary(newSummary);
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
    if (!summary || isUpdating) return;

    setIsUpdating(true);
    try {
      const updates = {
        [stackType === 'morning' ? 'morning_stack_complete' : 'evening_stack_complete']: 
          !summary[stackType === 'morning' ? 'morning_stack_complete' : 'evening_stack_complete']
      };

      const { data, error } = await upsertDailySummary(today, updates);
      
      if (error) throw error;

      // Optimistically update local state
      setSummary(prev => prev ? {
        ...prev,
        [stackType === 'morning' ? 'morning_stack_complete' : 'evening_stack_complete']:
          !prev[stackType === 'morning' ? 'morning_stack_complete' : 'evening_stack_complete']
      } : null);

      onUpdate?.();
    } catch (err) {
      console.error('Error updating stack:', err);
      // Refetch to restore correct state
      await fetchTodaySummary();
    } finally {
      setIsUpdating(false);
    }
  };

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
      <h2 className="text-lg font-semibold text-gray-400 mb-6 uppercase tracking-wider">
        📋 Habit Stacks
      </h2>

      {/* Meeting Mode Notice */}
      {summary?.meeting_mode && (
        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">🔵 Meeting Mode: Evening shutdown penalty disabled</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Morning Stack */}
        <div>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            🌅 Morning Stack
            {summary?.morning_stack_complete && (
              <span className="text-sm text-accent-success">✓ Complete</span>
            )}
          </h3>
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
                    text-accent-success focus:ring-accent-success focus:ring-offset-dark-bg"
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
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            🌙 Evening Stack
            {summary?.evening_stack_complete && (
              <span className="text-sm text-accent-success">✓ Complete</span>
            )}
          </h3>
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
                    text-accent-success focus:ring-accent-success focus:ring-offset-dark-bg"
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
