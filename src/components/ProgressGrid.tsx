'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, HARDCODED_USER_ID } from '@/lib/supabase';

interface DayData {
  date: string;
  rating: 'perfect' | 'partial' | 'missed' | null;
  meetingMode: boolean;
  morningStackComplete: boolean;
  eveningStackComplete: boolean;
  hasReadingLog: boolean;
}

interface ProgressGridProps {
  onSelectDate?: (date: Date) => void;
}

// Helper: Normalize a date to YYYY-MM-DD string (timezone-aware, ignoring time)
const normalizeToYYYYMMDD = (date: Date | string): string => {
  if (typeof date === 'string') {
    // Already a string, just return it if it matches YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse it
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return date;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * ProgressGrid Component - Visual Review (GitHub-style contribution graph)
 * Shows only days that have been logged (Growing History)
 * Uses HARDCODED_USER_ID for single player mode
 * Zero State: Shows "Your journey begins tomorrow" if no logs exist
 */
export default function ProgressGrid({ onSelectDate }: ProgressGridProps) {
  const [gridData, setGridData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // CRITICAL: Explicitly query BOTH daily_summaries and reading_logs
      // with explicit user_id filter for single-player mode
      const [summariesRes, logsRes] = await Promise.all([
        supabase
          ?.from('daily_summaries')
          .select('*')
          .eq('user_id', HARDCODED_USER_ID)
          .order('date', { ascending: true }) || { data: null, error: null },
        supabase
          ?.from('reading_logs')
          .select('date')
          .eq('user_id', HARDCODED_USER_ID) || { data: null, error: null }
      ]);

      if (summariesRes.error) {
        console.warn('Error fetching summaries:', summariesRes.error.message);
      }
      if (logsRes.error) {
        console.warn('Error fetching reading logs:', logsRes.error.message);
      }

      // CRITICAL: Bulletproof date normalization - convert all dates to YYYY-MM-DD strings
      // Supabase returns dates as strings (e.g., '2026-02-21'), normalize them properly
      
      // Create a Set of dates that have reading logs (normalized to YYYY-MM-DD)
      const readingLogDatesSet = new Set<string>();
      (logsRes.data || []).forEach(log => {
        const normalizedDate = normalizeToYYYYMMDD(log.date);
        readingLogDatesSet.add(normalizedDate);
      });

      // Map daily summaries data with normalized dates and track completion status
      const summariesMap: Record<string, DayData> = {};
      (summariesRes.data || []).forEach(summary => {
        // CRITICAL: Normalize the date from database (YYYY-MM-DD string)
        const normalizedDate = normalizeToYYYYMMDD(summary.date);
        
        summariesMap[normalizedDate] = {
          date: normalizedDate,
          rating: summary.day_rating as 'perfect' | 'partial' | 'missed' | null,
          meetingMode: summary.meeting_mode || false,
          morningStackComplete: summary.morning_stack_complete || false,
          eveningStackComplete: summary.evening_stack_complete || false,
          hasReadingLog: readingLogDatesSet.has(normalizedDate)
        };
      });

      // Combine: add dates that only have reading logs (no habit data)
      // If a date has reading log but no habit data, mark as 'partial' so it lights up
      const allDatesSet = new Set<string>(Object.keys(summariesMap));
      readingLogDatesSet.forEach(d => allDatesSet.add(d));
      const allDates = Array.from(allDatesSet);
      
      const combinedData: DayData[] = Array.from(allDates).sort().map(date => {
        // If we have summary data, use it
        if (summariesMap[date]) {
          return summariesMap[date];
        }
        // If only reading log exists (no habit data), mark as 'partial' to light up
        return {
          date,
          rating: 'partial' as const,
          meetingMode: false,
          morningStackComplete: false,
          eveningStackComplete: false,
          hasReadingLog: true
        };
      });

      // CRITICAL: Dynamic stats calculation based on merged data
      // - Perfect: Any day where the daily_summaries row shows all habit stacks as complete
      // - Partial: Any day that has at least one completed habit stack OR at least one entry in reading_logs
      const calculatedData = combinedData.map(day => {
        // Check if this is a "perfect" day
        const isPerfect = day.morningStackComplete && day.eveningStackComplete;
        
        // Check if this is a "partial" day:
        // - Has at least one completed habit stack OR
        // - Has at least one reading log entry
        const hasPartialHabit = day.morningStackComplete || day.eveningStackComplete;
        const isPartial = hasPartialHabit || day.hasReadingLog;
        
        return {
          ...day,
          // Override rating based on dynamic calculation
          rating: isPerfect ? 'perfect' as const : (isPartial ? 'partial' as const : (day.rating || 'missed' as const))
        };
      });

      setGridData(calculatedData);
    } catch (err) {
      console.warn('Error fetching progress:', err);
      setGridData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Color coding for the grid cells - GitHub-style contribution graph
  const getCellColor = (rating: string | null, isMeetingMode: boolean): string => {
    if (isMeetingMode) return 'bg-accent-info/60';
    
    // GitHub-style contribution graph colors:
    // Level 0 (Empty): bg-gray-800/80 or bg-slate-800
    // Level 1 (Low Activity): bg-emerald-900/60
    // Level 2 (Medium Activity): bg-emerald-600  
    // Level 3+ (High Activity): bg-emerald-400
    switch (rating) {
      case 'perfect':
        // High activity - bright emerald
        return 'bg-emerald-400';
      case 'partial':
        // Medium activity - medium emerald
        return 'bg-emerald-600';
      case 'missed':
        // Low activity - dark emerald (but visible)
        return 'bg-emerald-900/60';
      default:
        // Empty - dark gray (visible against background)
        return 'bg-gray-800/80';
    }
  };

  // Format date for tooltip
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle cell click
  const handleCellClick = (dateStr: string) => {
    if (onSelectDate) {
      onSelectDate(new Date(dateStr));
    }
  };

  // Calculate stats from real data
  const perfectDays = gridData.filter(d => d.rating === 'perfect').length;
  const partialDays = gridData.filter(d => d.rating === 'partial').length;
  const missedDays = gridData.filter(d => d.rating === 'missed').length;
  const meetingDays = gridData.filter(d => d.meetingMode).length;

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">📊 Growing History</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-900/60" title="Missed" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600" title="Partial" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400" title="Perfect" />
            <div className="w-3 h-3 rounded-sm bg-accent-info/60" title="Meeting Mode" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Zero State */}
      {isLoading ? (
        <div className="flex gap-1 py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-sm bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : gridData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Your journey begins tomorrow</p>
          <p className="text-gray-600 text-sm mt-2">Start logging your habits to build your history</p>
        </div>
      ) : (
        <>
          {/* Grid Container */}
          <div className="overflow-x-auto">
            <div className="flex gap-1 flex-wrap">
              {gridData.map((day) => (
                <div
                  key={day.date}
                  className="group relative"
                >
                  <button
                    onClick={() => handleCellClick(day.date)}
                    className={`
                      w-4 h-4 rounded-sm transition-all duration-200
                      ${getCellColor(day.rating, day.meetingMode)}
                      hover:scale-125 cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-accent-success focus:ring-offset-1 focus:ring-offset-dark-bg
                    `}
                    title={`${formatDate(day.date)}: ${day.rating || 'No data'}${day.meetingMode ? ' (Meeting Mode)' : ''}`}
                    aria-label={`View details for ${formatDate(day.date)}`}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                    hidden group-hover:block z-10">
                    <div className="bg-dark-card border border-dark-border rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                      <p className="text-white font-medium">{formatDate(day.date)}</p>
                      <p className="text-gray-400">
                        {day.meetingMode 
                          ? 'Meeting Mode' 
                          : day.rating === 'perfect' 
                            ? '✅ Perfect Day' 
                            : day.rating === 'partial' 
                              ? '⚠️ Partial Day' 
                              : '❌ Missed'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-4 pt-4 border-t border-dark-border">
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-success">{perfectDays}</p>
                <p className="text-gray-500">Perfect</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-warning">{partialDays}</p>
                <p className="text-gray-500">Partial</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-500">{missedDays}</p>
                <p className="text-gray-500">Missed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-info">{meetingDays}</p>
                <p className="text-gray-500">Meetings</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
