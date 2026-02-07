'use client';

import { useState, useEffect } from 'react';
import { supabase, HARDCODED_USER_ID } from '@/lib/supabase';

interface DailyDetailModalProps {
  date: Date;
  onClose: () => void;
}

interface DailySummary {
  wake_up_completed: boolean;
  morning_stack_complete: boolean;
  evening_stack_complete: boolean;
  meeting_mode: boolean;
  day_rating: string | null;
  created_at: string;
}

interface ReadingLog {
  book_title: string;
  chapters_read: number;
  key_learning: string;
  created_at: string;
}

/**
 * DailyDetailModal - Popup showing full history for a specific date
 * Uses HARDCODED_USER_ID for single player mode
 */
export default function DailyDetailModal({ date, onClose }: DailyDetailModalProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateString = date.toISOString().split('T')[0];
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Query Supabase directly for daily summary
        const { data: summaryData, error: summaryError } = await supabase
          ?.from('daily_summaries')
          .select('*')
          .eq('user_id', HARDCODED_USER_ID)
          .eq('date', dateString)
          .single() || { data: null, error: null };

        if (summaryError && summaryError.code !== 'PGRST116') {
          console.warn('Summary error:', summaryError);
        }

        setSummary(summaryData as DailySummary | null);

        // Query Supabase directly for reading logs
        const { data: readingData, error: readingError } = await supabase
          ?.from('reading_logs')
          .select('*')
          .eq('user_id', HARDCODED_USER_ID)
          .eq('date', dateString)
          .order('created_at', { ascending: false }) || { data: [], error: null };

        if (readingError) {
          console.warn('Reading logs error:', readingError);
        }

        setReadingLogs((readingData as ReadingLog[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateString]);

  return (
    // Backdrop
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div 
        className="bg-[#151520] border border-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#151520] border-b border-gray-800 p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">📋 {formattedDate}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-success"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Day Rating */}
              {summary?.day_rating && (
                <div className="flex items-center justify-center">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold
                    ${summary.day_rating === 'perfect' ? 'bg-accent-success/20 text-accent-success' :
                      summary.day_rating === 'partial' ? 'bg-accent-warning/20 text-accent-warning' :
                      summary.day_rating === 'meeting' ? 'bg-accent-info/20 text-accent-info' :
                      'bg-gray-700 text-gray-400'}`}>
                    {summary.day_rating === 'perfect' ? '🌟 Perfect Day' :
                      summary.day_rating === 'partial' ? '📉 Partial Day' :
                      summary.day_rating === 'meeting' ? '📅 Meeting Mode Day' :
                      '❌ Missed Day'}
                  </span>
                </div>
              )}

              {/* Habits Checklist */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">✅ Habits</h3>
                <div className="space-y-2">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    summary?.wake_up_completed ? 'bg-accent-success/10' : 'bg-gray-800/50'
                  }`}>
                    <span className="text-lg">{summary?.wake_up_completed ? '✅' : '⬜'}</span>
                    <span className={summary?.wake_up_completed ? 'text-white' : 'text-gray-500'}>
                      6 AM Victory
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    summary?.morning_stack_complete ? 'bg-accent-success/10' : 'bg-gray-800/50'
                  }`}>
                    <span className="text-lg">{summary?.morning_stack_complete ? '✅' : '⬜'}</span>
                    <span className={summary?.morning_stack_complete ? 'text-white' : 'text-gray-500'}>
                      Morning Stack
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    summary?.evening_stack_complete ? 'bg-accent-success/10' : 'bg-gray-800/50'
                  }`}>
                    <span className="text-lg">{summary?.evening_stack_complete ? '✅' : '⬜'}</span>
                    <span className={summary?.evening_stack_complete ? 'text-white' : 'text-gray-500'}>
                      Evening Stack
                    </span>
                  </div>
                  {summary?.meeting_mode && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-info/10">
                      <span className="text-lg">📅</span>
                      <span className="text-accent-info">Meeting Mode Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Scripture Reading */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">📖 Scripture</h3>
                {readingLogs.length > 0 ? (
                  <div className="space-y-2">
                    {readingLogs.map((log, index) => (
                      <div key={index} className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <span className="text-white font-medium">{log.book_title}</span>
                          <span className="text-accent-success text-sm">+{log.chapters_read} chapter{log.chapters_read > 1 ? 's' : ''}</span>
                        </div>
                        {log.key_learning && (
                          <p className="text-gray-400 text-sm mt-2 italic">"{log.key_learning}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No scripture reading logged</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#151520] border-t border-gray-800 p-4 pt-3">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
