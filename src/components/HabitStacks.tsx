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
  face_washed: boolean;
  phone_plugged_in: boolean;
  gym_exercise: boolean;
  meditation: boolean;
  bible_read: boolean;
  laptop_shutdown: boolean;
  morning_stack_complete: boolean;
  evening_stack_complete: boolean;
  meeting_mode: boolean;
}

// Individual habit definitions
const morningHabits = [
  { id: 'face_washed', label: 'Face Washed (The Jolt)', emoji: '💧' },
  { id: 'phone_plugged_in', label: 'Phone Plugged In (The Setup)', emoji: '📱' },
  { id: 'gym_exercise', label: '30m Gym/Exercise (The Body)', emoji: '💪' },
  { id: 'meditation', label: 'Meditation (The Mind)', emoji: '🧘' },
];

const eveningHabits = [
  { id: 'bible_read', label: 'Bible Read (The Spirit)', emoji: '📖' },
  { id: 'laptop_shutdown', label: '10 PM Laptop Shutdown (The Discipline)', emoji: '🔒' },
];

// Map habit IDs to database columns
const habitToColumn: Record<string, keyof DailySummary> = {
  'face_washed': 'face_washed',
  'phone_plugged_in': 'phone_plugged_in',
  'gym_exercise': 'gym_exercise',
  'meditation': 'meditation',
  'bible_read': 'bible_read',
  'laptop_shutdown': 'laptop_shutdown',
};

/**
 * HabitStacks Component - Individual habit checkboxes with stack completion
 */
export default function HabitStacks({ onUpdate }: HabitStacksProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Calculate progress for morning stack (4 habits)
  const calculateMorningProgress = (): number => {
    if (!summary) return 0;
    const completed = [
      summary.face_washed,
      summary.phone_plugged_in,
      summary.gym_exercise,
      summary.meditation,
    ].filter(Boolean).length;
    return Math.round((completed / 4) * 100);
  };

  // Calculate progress for evening stack (2 habits)
  const calculateEveningProgress = (): number => {
    if (!summary) return 0;
    const completed = [
      summary.bible_read,
      summary.laptop_shutdown,
    ].filter(Boolean).length;
    return Math.round((completed / 2) * 100);
  };

  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    if (!summary) return 0;
    const morning = calculateMorningProgress();
    const evening = calculateEveningProgress();
    return Math.round((morning + evening) / 2);
  };

  // Check if all habits in a stack are complete
  const isStackComplete = (stack: 'morning' | 'evening'): boolean => {
    if (!summary) return false;
    if (stack === 'morning') {
      return summary.face_washed && 
             summary.phone_plugged_in && 
             summary.gym_exercise && 
             summary.meditation;
    } else {
      return summary.bible_read && summary.laptop_shutdown;
    }
  };

  // Fetch today's summary
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
        // Create new row with all habits initially incomplete
        const { data: newSummary, error: insertError } = await supabase
          .from('daily_summaries')
          .upsert({
            user_id: HARDCODED_USER_ID,
            date: today,
            face_washed: false,
            phone_plugged_in: false,
            gym_exercise: false,
            meditation: false,
            bible_read: false,
            laptop_shutdown: false,
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

  // Toggle individual habit
  const toggleHabit = async (habitId: string) => {
    if (isUpdating || !supabase) return;

    const column = habitToColumn[habitId];
    if (!column || !summary) return;

    setIsUpdating(true);

    try {
      const currentValue = summary[column];
      const newValue = !currentValue;

      // Determine which stack this habit belongs to
      const isMorning = morningHabits.some(h => h.id === habitId);
      const isEvening = eveningHabits.some(h => h.id === habitId);

      // Calculate what the new summary would look like with the toggle applied
      const updatedSummary = {
        ...summary,
        [column]: newValue
      };

      // Check if entire stack is now complete based on the NEW state
      const checkMorningComplete = (s: typeof summary) => 
        s && s.face_washed && s.phone_plugged_in && s.gym_exercise && s.meditation;
      const checkEveningComplete = (s: typeof summary) => 
        s && s.bible_read && s.laptop_shutdown;

      // Only set stack complete to true if ALL items are checked (100% progress)
      // If unchecking any item, set stack complete to false
      const morningComplete = isMorning 
        ? checkMorningComplete(updatedSummary) 
        : summary.morning_stack_complete;
      const eveningComplete = isEvening 
        ? checkEveningComplete(updatedSummary) 
        : summary.evening_stack_complete;

      // Optimistically update local state
      setSummary(updatedSummary);

      // Upsert to database (only mark stack complete when 100% achieved)
      const { error } = await supabase
        .from('daily_summaries')
        .upsert({
          user_id: HARDCODED_USER_ID,
          date: today,
          id: summary.id,
          [column]: newValue,
          morning_stack_complete: morningComplete,
          evening_stack_complete: eveningComplete
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) {
        console.error('Error updating habit:', error);
        await fetchTodaySummary();
      } else {
        onUpdate?.();
      }
    } catch (err) {
      console.error('Error updating habit:', err);
      await fetchTodaySummary();
    } finally {
      setIsUpdating(false);
    }
  };

  const morningProgress = calculateMorningProgress();
  const eveningProgress = calculateEveningProgress();
  const overallProgress = calculateOverallProgress();

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
        {/* Overall Progress Bar */}
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
            {morningHabits.map((habit) => {
              const column = habitToColumn[habit.id] as keyof DailySummary;
              const isChecked = summary ? (summary[column] ?? false) : false;
              return (
                <label
                  key={habit.id}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200
                    ${isChecked
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleHabit(habit.id)}
                    disabled={isUpdating}
                    className="w-6 h-6 rounded border-gray-600 bg-gray-700 
                      text-accent-success focus:ring-accent-success focus:ring-offset-dark-bg cursor-pointer"
                  />
                  <span className="text-xl">{habit.emoji}</span>
                  <span className={`text-white ${isChecked ? 'line-through opacity-60' : ''}`}>
                    {habit.label}
                  </span>
                </label>
              );
            })}
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
            {eveningHabits.map((habit) => {
              const column = habitToColumn[habit.id] as keyof DailySummary;
              const isChecked = summary ? (summary[column] ?? false) : false;
              return (
                <label
                  key={habit.id}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200
                    ${isChecked
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleHabit(habit.id)}
                    disabled={isUpdating}
                    className="w-6 h-6 rounded border-gray-600 bg-gray-700 
                      text-accent-success focus:ring-accent-success focus:ring-offset-dark-bg cursor-pointer"
                  />
                  <span className="text-xl">{habit.emoji}</span>
                  <span className={`text-white ${isChecked ? 'line-through opacity-60' : ''}`}>
                    {habit.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
