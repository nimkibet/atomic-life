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
 * Shows the last 30 days of activity with click-to-view details
 * Uses HARDCODED_USER_ID for single player mode
 */
export default function ProgressGrid({ onSelectDate }: ProgressGridProps) {
  const [gridData, setGridData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demo/fallback
  const generateMockData = useCallback((): DayData[] => {
    const dates: DayData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const daysAgo = 29 - i;
      const random = Math.random();
      
      if (daysAgo === 0) dates.push({ date: dateStr, rating: 'perfect', meetingMode: false });
      else if (daysAgo === 1) dates.push({ date: dateStr, rating: 'partial', meetingMode: false });
      else if (daysAgo === 2) dates.push({ date: dateStr, rating: null, meetingMode: true });
      else if (random > 0.7) dates.push({ date: dateStr, rating: 'partial', meetingMode: false });
      else if (random > 0.3) dates.push({ date: dateStr, rating: 'perfect', meetingMode: false });
      else dates.push({ date: dateStr, rating: null, meetingMode: false });
    }
    return dates;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Query Supabase directly for recent summaries
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        ?.from('daily_summaries')
        .select('*')
        .eq('user_id', HARDCODED_USER_ID)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false }) || { data: null, error: null };

      if (error) {
        console.warn('Using mock data:', error.message);
        setGridData(generateMockData());
      } else if (data && Array.isArray(data) && data.length > 0) {
        // Map Supabase data to our format
        const dates: string[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        const mappedData: DayData[] = dates.map(dateStr => {
          const summary = data.find((d: { date: string }) => d.date === dateStr);
          return {
            date: dateStr,
            rating: summary?.day_rating as 'perfect' | 'partial' | 'missed' | null,
            meetingMode: summary?.meeting_mode || false
          };
        });
        setGridData(mappedData);
      } else {
        setGridData(generateMockData());
      }
    } catch (err) {
      console.warn('Error fetching progress:', err);
      setGridData(generateMockData());
    } finally {
      setIsLoading(false);
    }
  }, [generateMockData]);

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

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">📊 30-Day Consistency</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-dark-bg border border-dark-border" />
            <div className="w-3 h-3 rounded-sm bg-accent-success/40" />
            <div className="w-3 h-3 rounded-sm bg-accent-success" />
            <div className="w-3 h-3 rounded-sm bg-accent-info/60" title="Meeting Mode" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex gap-1 min-w-max py-2">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="w-4 h-4 rounded-sm bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-1 min-w-max">
            <div className="flex flex-wrap gap-1 max-w-[280px]">
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
                      ${day.rating || day.meetingMode ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}
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
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-4 pt-4 border-t border-dark-border">
        <div className="flex justify-between text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-success">
              {gridData.filter(d => d.rating === 'perfect').length}
            </p>
            <p className="text-gray-400">Perfect</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-warning">
              {gridData.filter(d => d.rating === 'partial').length}
            </p>
            <p className="text-gray-400">Partial</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-500">
              {gridData.filter(d => d.rating === null && !d.meetingMode).length}
            </p>
            <p className="text-gray-400">Missed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-info">
              {gridData.filter(d => d.meetingMode).length}
            </p>
            <p className="text-gray-400">Meetings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
