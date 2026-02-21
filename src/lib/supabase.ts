import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase connection
// These should be set in your .env.local file:
// NEXT_PUBLIC_SUPABASE_URL=your-project-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Single Player Mode - Hardcoded User ID for "Nimrod"
 * Using this UUID to represent the user in the database
 */
export const HARDCODED_USER_ID = '00000000-0000-0000-0000-000000000001';
export const USER_NAME = 'Nimrod';

/**
 * Supabase client instance
 * Used for database operations (no auth required in single player mode)
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Type definitions for database tables
 */
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  target_identity: string;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  habit_type: 'morning' | 'evening' | 'scripture';
  stack_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  wake_up_completed: boolean;
  morning_stack_complete: boolean;
  evening_stack_complete: boolean;
  scripture_chapters_read: number;
  meeting_mode: boolean;
  day_rating: 'perfect' | 'partial' | 'missed' | 'meeting' | null;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  streak_type: 'overall' | 'morning' | 'evening' | 'scripture';
  current_count: number;
  longest_count: number;
  last_completed_date: string | null;
  updated_at: string;
}

export interface ReadingLog {
  id: string;
  user_id: string;
  book_title: string;
  chapters_read: number;
  key_learning: string;
  date: string;
  created_at: string;
}

export interface DayPlan {
  id: string;
  user_id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  is_complete: boolean;
  created_at: string;
}

/**
 * Database helper functions using HARDCODED_USER_ID
 */

/**
 * Get today's summary for the hardcoded user
 */
export async function getTodaySummary(date: string) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', HARDCODED_USER_ID)
    .eq('date', date)
    .single();
}

/**
 * Upsert daily summary for the hardcoded user
 */
export async function upsertDailySummary(date: string, updates: Partial<DailySummary>) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('daily_summaries')
    .upsert({ user_id: HARDCODED_USER_ID, date, ...updates }, { onConflict: 'user_id,date' })
    .select()
    .single();
}

/**
 * Get summaries for the last N days for the hardcoded user
 */
export async function getRecentSummaries(days: number = 30) {
  if (!supabase) return { data: null, error: null };
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  return supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', HARDCODED_USER_ID)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });
}

/**
 * Insert a reading log for the hardcoded user
 * Uses upsert to handle duplicate entries for same book on same day
 */
export async function insertReadingLog(log: {
  user_id?: string;
  book_title: string;
  chapters_read: number;
  key_learning: string;
  date: string;
}) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('reading_logs')
    .upsert({
      user_id: log.user_id || HARDCODED_USER_ID,
      book_title: log.book_title,
      chapters_read: log.chapters_read,
      key_learning: log.key_learning,
      date: log.date
    }, { onConflict: 'user_id,date,book_title' })
    .select()
    .single();
}

/**
 * Get reading logs for a specific date
 */
export async function getReadingLogsForDate(date: string) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('reading_logs')
    .select('*')
    .eq('user_id', HARDCODED_USER_ID)
    .eq('date', date)
    .order('created_at', { ascending: false });
}

/**
 * Update scripture chapters count
 */
export async function updateScriptureChapters(date: string, chaptersToAdd: number) {
  if (!supabase) return { data: null, error: null };
  
  // First get current value
  const { data: current } = await supabase
    .from('daily_summaries')
    .select('scripture_chapters_read')
    .eq('user_id', HARDCODED_USER_ID)
    .eq('date', date)
    .single();
  
  const currentChapters = current?.scripture_chapters_read || 0;
  
  return supabase
    .from('daily_summaries')
    .upsert({ 
      user_id: HARDCODED_USER_ID, 
      date, 
      scripture_chapters_read: currentChapters + chaptersToAdd 
    }, { onConflict: 'user_id,date' })
    .select()
    .single();
}

// ============ DAY PLAN HELPERS ============

/**
 * Get day plan items for a specific date
 */
export async function getDayPlanForDate(date: string) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('day_plan')
    .select('*')
    .eq('user_id', HARDCODED_USER_ID)
    .eq('date', date)
    .order('start_time', { ascending: true });
}

/**
 * Insert a new day plan item
 */
export async function insertDayPlanItem(item: {
  title: string;
  start_time: string;
  end_time: string;
  date: string;
}) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('day_plan')
    .insert({
      user_id: HARDCODED_USER_ID,
      is_complete: false,
      ...item
    })
    .select()
    .single();
}

/**
 * Update day plan item completion status
 */
export async function updateDayPlanItemComplete(id: string, isComplete: boolean) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('day_plan')
    .update({ is_complete: isComplete })
    .eq('id', id)
    .eq('user_id', HARDCODED_USER_ID)
    .select()
    .single();
}

/**
 * Delete a day plan item
 */
export async function deleteDayPlanItem(id: string) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from('day_plan')
    .delete()
    .eq('id', id)
    .eq('user_id', HARDCODED_USER_ID);
}
