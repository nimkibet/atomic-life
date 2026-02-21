'use client';

import { useState, useEffect, useCallback } from 'react';
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

// Strict boolean state interface
interface HabitState {
  face_washed: boolean;
  phone_plugged_in: boolean;
  gym_exercise: boolean;
  meditation: boolean;
  bible_read: boolean;
  laptop_shutdown: boolean;
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

// Get today's date string for localStorage key
const getTodayKey = (): string => {
  return `habit_state_${new Date().toISOString().split('T')[0]}`;
};

// Get initial empty state
const getInitialState = (): HabitState => ({
  face_washed: false,
  phone_plugged_in: false,
  gym_exercise: false,
  meditation: false,
  bible_read: false,
  laptop_shutdown: false,
});

/**
 * HabitStacks Component - Individual habit checkboxes with localStorage persistence
 */
export default function HabitStacks({ onUpdate }: HabitStacksProps) {
  const [habitState, setHabitState] = useState<HabitState>(getInitialState);
  const [dbSummary, setDbSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): HabitState => {
    try {
      const key = getTodayKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all fields are booleans
        return {
          face_washed: Boolean(parsed.face_washed),
          phone_plugged_in: Boolean(parsed.phone_plugged_in),
          gym_exercise: Boolean(parsed.gym_exercise),
          meditation: Boolean(parsed.meditation),
          bible_read: Boolean(parsed.bible_read),
          laptop_shutdown: Boolean(parsed.laptop_shutdown),
        };
      }
    } catch (err) {
      console.warn('Error loading from localStorage:', err);
    }
    return getInitialState();
  }, []);

  // Save to localStorage
  const saveToLocalStorage = useCallback((state: HabitState) => {
    try {
      const key = getTodayKey();
      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn('Error saving to localStorage:', err);
    }
  }, []);

  // Calculate progress for morning stack (4 habits)
  const calculateMorningProgress = (): number => {
    const completed = [
      habitState.face_washed,
      habitState.phone_plugged_in,
      habitState.gym_exercise,
      habitState.meditation,
    ].filter(Boolean).length;
    return Math.round((completed / 4) * 100);
  };

  // Calculate progress for evening stack (2 habits)
  const calculateEveningProgress = (): number => {
    const completed = [
      habitState.bible_read,
      habitState.laptop_shutdown,
    ].filter(Boolean).length;
    return Math.round((completed / 2) * 100);
  };

  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    const morning = calculateMorningProgress();
    const evening = calculateEveningProgress();
    return Math.round((morning + evening) / 2);
  };

  // Check if all habits in a stack are complete
  const isStackComplete = (stack: 'morning' | 'evening'): boolean => {
    if (stack === 'morning') {
      return habitState.face_washed && 
             habitState.phone_plugged_in && 
             habitState.gym_exercise && 
             habitState.meditation;
    } else {
      return habitState.bible_read && habitState.laptop_shutdown;
    }
  };

  // Hydrate: fetch database first, then merge with localStorage
  const hydrateFromDatabase = async () => {
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
        const dbData = data as DailySummary;
        setDbSummary(dbData);
        
        // If database says stack is complete, use database values
        if (dbData.morning_stack_complete || dbData.evening_stack_complete) {
          setHabitState({
            face_washed: Boolean(dbData.face_washed),
            phone_plugged_in: Boolean(dbData.phone_plugged_in),
            gym_exercise: Boolean(dbData.gym_exercise),
            meditation: Boolean(dbData.meditation),
            bible_read: Boolean(dbData.bible_read),
            laptop_shutdown: Boolean(dbData.laptop_shutdown),
          });
        } else {
          // Database not complete, load from localStorage (partial progress)
          const localState = loadFromLocalStorage();
          setHabitState(localState);
        }
      } else {
        // No database record, create one with localStorage state
        const localState = loadFromLocalStorage();
        setHabitState(localState);
        
        await supabase
          .from('daily_summaries')
          .upsert({
            user_id: HARDCODED_USER_ID,
            date: today,
            face_washed: localState.face_washed,
            phone_plugged_in: localState.phone_plugged_in,
            gym_exercise: localState.gym_exercise,
            meditation: localState.meditation,
            bible_read: localState.bible_read,
            laptop_shutdown: localState.laptop_shutdown,
            morning_stack_complete: false,
            evening_stack_complete: false,
            meeting_mode: false
          }, { onConflict: 'user_id,date' });
      }
    } catch (err) {
      console.warn('Error:', err);
      // Fallback to localStorage on error
      setHabitState(loadFromLocalStorage());
    } finally {
      setIsLoading(false);
      setHasHydrated(true);
    }
  };

  // Initial hydration
  useEffect(() => {
    hydrateFromDatabase();
  }, []);

  // Save individual habit to database (for partial progress)
  const saveHabitToDb = async (habitId: string, value: boolean) => {
    if (!supabase || !dbSummary) return;
    
    const column = habitId as keyof HabitState;
    await supabase
      .from('daily_summaries')
      .upsert({
        user_id: HARDCODED_USER_ID,
        date: today,
        id: dbSummary.id,
        [column]: value,
      }, { onConflict: 'user_id,date' });
  };

  // Mark stack as complete in database when 100% is reached
  const markStackComplete = async (stack: 'morning' | 'evening') => {
    if (!supabase || !dbSummary) return;
    
    const updates: Partial<DailySummary> = {};
    if (stack === 'morning') {
      updates.morning_stack_complete = true;
    } else {
      updates.evening_stack_complete = true;
    }

    await supabase
      .from('daily_summaries')
      .upsert({
        user_id: HARDCODED_USER_ID,
        date: today,
        id: dbSummary.id,
        ...updates,
      }, { onConflict: 'user_id,date' })
      .select()
      .single();
      
    onUpdate?.();
  };

  // Watch for 100% completion and trigger database save
  useEffect(() => {
    if (!hasHydrated || !dbSummary) return;

    const morningComplete = isStackComplete('morning');
    const eveningComplete = isStackComplete('evening');
    const dbMorningComplete = dbSummary.morning_stack_complete;
    const dbEveningComplete = dbSummary.evening_stack_complete;

    // If morning stack just hit 100% and DB doesn't have it, save
    if (morningComplete && !dbMorningComplete) {
      markStackComplete('morning');
      setDbSummary(prev => prev ? { ...prev, morning_stack_complete: true } : null);
    }

    // If evening stack just hit 100% and DB doesn't have it, save
    if (eveningComplete && !dbEveningComplete) {
      markStackComplete('evening');
      setDbSummary(prev => prev ? { ...prev, evening_stack_complete: true } : null);
    }
  }, [habitState, hasHydrated, dbSummary]);

  // Toggle individual habit
  const toggleHabit = (habitId: string) => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      const currentValue = habitState[habitId as keyof HabitState];
      const newValue = !currentValue;

      // Update local state
      const newState = {
        ...habitState,
        [habitId]: newValue,
      };
      setHabitState(newState);
      
      // Save to localStorage
      saveToLocalStorage(newState);

      // Save to database (partial progress)
      saveHabitToDb(habitId, newValue);
    } catch (err) {
      console.error('Error toggling habit:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const morningProgress = calculateMorningProgress();
  const eveningProgress = calculateEveningProgress();
  const overallProgress = calculateOverallProgress();
  const morningComplete = isStackComplete('morning');
  const eveningComplete = isStackComplete('evening');

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
      {dbSummary?.meeting_mode && (
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
              {morningComplete && (
                <span className="text-sm text-accent-success">✓ Complete</span>
              )}
            </h3>
            <span className="text-sm text-gray-400">{morningProgress}%</span>
          </div>
          <div className="space-y-3">
            {morningHabits.map((habit) => {
              const isChecked: boolean = habitState[habit.id as keyof HabitState] ?? false;
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
              {eveningComplete && (
                <span className="text-sm text-accent-success">✓ Complete</span>
              )}
            </h3>
            <span className="text-sm text-gray-400">{eveningProgress}%</span>
          </div>
          <div className="space-y-3">
            {eveningHabits.map((habit) => {
              const isChecked: boolean = habitState[habit.id as keyof HabitState] ?? false;
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
