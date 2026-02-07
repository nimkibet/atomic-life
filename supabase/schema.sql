-- Atomic Life Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  target_identity TEXT DEFAULT 'Athlete',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HABITS TABLE
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  habit_type TEXT NOT NULL CHECK (habit_type IN ('morning', 'evening', 'scripture')),
  stack_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HABIT_LOGS TABLE
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_id, date)
);

-- 4. DAILY_SUMMARIES TABLE
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  wake_up_completed BOOLEAN DEFAULT false,
  morning_stack_complete BOOLEAN DEFAULT false,
  evening_stack_complete BOOLEAN DEFAULT false,
  scripture_chapters_read INTEGER DEFAULT 0,
  meeting_mode BOOLEAN DEFAULT false,
  day_rating TEXT CHECK (day_rating IN ('perfect', 'partial', 'missed', 'meeting')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 5. STREAKS TABLE
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('overall', 'morning', 'evening', 'scripture')),
  current_count INTEGER DEFAULT 0,
  longest_count INTEGER DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- HABITS POLICIES
CREATE POLICY "Users can view own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- HABIT_LOGS POLICIES
CREATE POLICY "Users can view own logs" ON habit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own logs" ON habit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON habit_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- DAILY_SUMMARIES POLICIES
CREATE POLICY "Users can view own summaries" ON daily_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own summaries" ON daily_summaries
  FOR ALL USING (auth.uid() = user_id);

-- STREAKS POLICIES
CREATE POLICY "Users can view own streaks" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR AUTO-CREATING PROFILE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, date);
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, date);
CREATE INDEX idx_streaks_user_type ON streaks(user_id, streak_type);
