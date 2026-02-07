'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, HARDCODED_USER_ID } from '@/lib/supabase';

interface DayData {
  date: string;
  rating: 'perfect' | 'partial' | 'missed' | null;
  meetingMode: boolean;
}

interface ProgressGridProps {
  onSelectDate?: (date: Date) => void;
}

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
      const { data, error } = await supabase
        ?.from('daily_summaries')
        .select('*')
        .eq('user_id', HARDCODED_USER_ID)
        .order('date', { ascending: true }) || { data: null, error: null };

      if (error) {
        console.warn('Error fetching progress:', error.message);
      }

      // Map directly over fetched data - no filler
      const mappedData: DayData[] = (data || []).map(summary => ({
        date: summary.date,
        rating: summary.day_rating as 'perfect' | 'partial' | 'missed' | null,
        meetingMode: summary.meeting_mode || false
      }));

      setGridData(mappedData);
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

  // Color coding for the grid cells
  const getCellColor = (rating: string | null, isMeetingMode: boolean): string => {
    if (isMeetingMode) return 'bg-accent-info/60';
    
    switch (rating) {
      case 'perfect':
        return 'bg-accent-success';
      case 'partial':
        return 'bg-accent-success/40';
      case 'missed':
        return 'bg-dark-border';
      default:
        return 'bg-dark-bg border border-dark-border';
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
            <div className="w-3 h-3 rounded-sm bg-accent-success/40" title="Partial" />
            <div className="w-3 h-3 rounded-sm bg-accent-success" title="Perfect" />
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
