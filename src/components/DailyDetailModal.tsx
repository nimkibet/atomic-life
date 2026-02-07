'use client';

import { useState, useEffect } from 'react';
import { getTodaySummary, getReadingLogsForDate } from '@/lib/supabase';

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
        // Fetch daily summary
        const { data: summaryData, error: summaryError } = await getTodaySummary(dateString);
        
        if (summaryError && summaryError.code !== 'PGRST116') {
          console.warn('Summary error:', summaryError);
        }

        setSummary(summaryData || null);

        // Fetch reading logs
        const { data: readingData, error: readingError } = await getReadingLogsForDate(dateString);
        
        if (readingError) {
          console.warn('Reading logs error:', readingError);
        }

        setReadingLogs(readingData || []);
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
            // Loading skeleton
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-1/3 mb-2"></div>
                  <div className="h-12 bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            <>
              {/* Morning Victory Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  🌅 Morning Victory
                </h3>
                <div className={`p-4 rounded-lg border ${
                  summary?.wake_up_completed 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-gray-800/50 border-gray-700'
                }`}>
                  {summary?.wake_up_completed ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      <div>
                        <p className="text-green-400 font-semibold">Victory Secured!</p>
                        <p className="text-gray-400 text-sm">You won the morning</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">❌</span>
                      <div>
                        <p className="text-gray-400 font-semibold">Window Missed</p>
                        <p className="text-gray-500 text-sm">Try again tomorrow</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Habit Stacks Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  📋 Habit Stacks
                </h3>
                <div className="space-y-3">
                  {/* Morning Stack */}
                  <div className={`p-4 rounded-lg border ${
                    summary?.morning_stack_complete
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{summary?.morning_stack_complete ? '✅' : '⬜'}</span>
                      <div>
                        <p className="text-white font-medium">Morning Stack</p>
                        <p className="text-gray-400 text-sm">
                          {summary?.morning_stack_complete ? 'All completed' : 'Not yet completed'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Evening Stack */}
                  <div className={`p-4 rounded-lg border ${
                    summary?.evening_stack_complete
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{summary?.evening_stack_complete ? '✅' : '⬜'}</span>
                      <div>
                        <p className="text-white font-medium">Evening Stack</p>
                        <p className="text-gray-400 text-sm">
                          {summary?.evening_stack_complete ? 'All completed' : 'Not yet completed'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Mode Badge */}
                  {summary?.meeting_mode && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔵</span>
                        <p className="text-blue-400 text-sm font-medium">Meeting Mode Active</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Knowledge Hunt Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  📚 Knowledge Hunt
                </h3>
                {readingLogs.length > 0 ? (
                  <div className="space-y-3">
                    {readingLogs.map((log, index) => (
                      <div key={index} className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{log.book_title}</span>
                          <span className="text-gray-400 text-sm">Ch. {log.chapters_read}</span>
                        </div>
                        {log.key_learning && (
                          <p className="text-gray-300 text-sm italic">"{log.key_learning}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <p className="text-gray-500 text-sm text-center">No reading logged this day</p>
                  </div>
                )}
              </div>

              {/* Day Rating */}
              {summary?.day_rating && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    ⭐ Day Rating
                  </h3>
                  <div className={`p-4 rounded-lg border ${
                    summary.day_rating === 'perfect'
                      ? 'bg-green-500/10 border-green-500/20'
                      : summary.day_rating === 'partial'
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <p className={`font-medium ${
                      summary.day_rating === 'perfect'
                        ? 'text-green-400'
                        : summary.day_rating === 'partial'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}>
                      {summary.day_rating === 'perfect'
                        ? '🌟 Perfect Day'
                        : summary.day_rating === 'partial'
                          ? '⚠️ Partial Day'
                          : '❌ Missed Day'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#151520] border-t border-gray-800 p-4">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg
              transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
