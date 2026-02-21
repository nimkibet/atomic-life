'use client';

import { useState, useEffect } from 'react';
import { insertReadingLog, updateScriptureChapters, getReadingLogsForDate, HARDCODED_USER_ID } from '@/lib/supabase';

interface ReadingLogEntry {
  id: string;
  book_title: string;
  chapters_read: number;
  key_learning: string;
  date: string;
  created_at: string;
}

interface ReadingLogProps {
  onLogAdded?: () => void;
}

/**
 * ReadingLog Component - Active Learning Module
 * Allows users to log daily reading and capture key learnings
 * Uses HARDCODED_USER_ID for single player mode
 */
export default function ReadingLog({ onLogAdded }: ReadingLogProps) {
  const [bookTitle, setBookTitle] = useState('The Bible');
  const [customBook, setCustomBook] = useState('');
  const [chaptersRead, setChaptersRead] = useState(1);
  const [keyLearning, setKeyLearning] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<ReadingLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Fetch today's reading logs
  const fetchTodayLogs = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: fetchError } = await getReadingLogsForDate(today);
      
      if (fetchError) {
        console.warn('Error fetching logs:', fetchError);
      } else if (data) {
        setRecentLogs(data as ReadingLogEntry[]);
      }
    } catch (err) {
      console.warn('Error fetching logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch logs on mount
  useEffect(() => {
    fetchTodayLogs();
  }, []);

  const bookOptions = [
    'The Bible',
    'Atomic Habits',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const finalBookTitle = bookTitle === 'Other' && customBook ? customBook : bookTitle;
      const today = new Date().toISOString().split('T')[0];

      // Create a temporary ID for optimistic UI
      const tempId = `temp-${Date.now()}`;
      const newLogEntry: ReadingLogEntry = {
        id: tempId,
        book_title: finalBookTitle,
        chapters_read: chaptersRead,
        key_learning: keyLearning,
        date: today,
        created_at: new Date().toISOString()
      };

      // Optimistically add to recent logs immediately
      setRecentLogs(prev => [newLogEntry, ...prev]);

      // Insert reading log with proper user_id
      const { data: insertedData, error: insertError } = await insertReadingLog({
        user_id: HARDCODED_USER_ID,
        book_title: finalBookTitle,
        chapters_read: chaptersRead,
        key_learning: keyLearning,
        date: today
      });

      if (insertError) {
        // Remove optimistic update on error
        setRecentLogs(prev => prev.filter(log => log.id !== tempId));
        throw new Error(insertError.message || 'Failed to save reading log');
      }

      // Replace temp entry with real data from DB
      if (insertedData) {
        setRecentLogs(prev => prev.map(log => 
          log.id === tempId ? insertedData[0] as ReadingLogEntry : log
        ));
      }

      // Update scripture chapters count in daily_summaries
      if (bookTitle === 'The Bible') {
        await updateScriptureChapters(today, chaptersRead);
      }

      // Clear form
      setKeyLearning('');
      setChaptersRead(1);
      setShowSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);

      onLogAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reading log');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📚 Daily Learning</h3>
      
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-4 p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg">
          <p className="text-accent-success text-sm">✓ Reading log saved successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg">
          <p className="text-accent-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Book Title Selection */}
        <div>
          <label htmlFor="bookTitle" className="block text-sm text-gray-400 mb-2">
            Book Title
          </label>
          <select
            id="bookTitle"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-accent-success focus:border-transparent"
          >
            {bookOptions.map(book => (
              <option key={book} value={book}>{book}</option>
            ))}
          </select>
        </div>

        {/* Custom Book Input (shown when "Other" is selected) */}
        {bookTitle === 'Other' && (
          <div>
            <label htmlFor="customBook" className="block text-sm text-gray-400 mb-2">
              Enter Book Title
            </label>
            <input
              type="text"
              id="customBook"
              value={customBook}
              onChange={(e) => setCustomBook(e.target.value)}
              placeholder="Enter book title..."
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white
                focus:outline-none focus:ring-2 focus:ring-accent-success focus:border-transparent"
            />
          </div>
        )}

        {/* Chapters Read */}
        <div>
          <label htmlFor="chaptersRead" className="block text-sm text-gray-400 mb-2">
            Chapters Read
          </label>
          <input
            type="number"
            id="chaptersRead"
            min="1"
            max="100"
            value={chaptersRead}
            onChange={(e) => setChaptersRead(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-accent-success focus:border-transparent"
          />
        </div>

        {/* Key Learning */}
        <div>
          <label htmlFor="keyLearning" className="block text-sm text-gray-400 mb-2">
            One Big Idea / Key Learning
          </label>
          <textarea
            id="keyLearning"
            rows={3}
            value={keyLearning}
            onChange={(e) => setKeyLearning(e.target.value)}
            placeholder="What did you learn today?"
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-accent-success focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving || !keyLearning.trim()}
          className="w-full py-3 px-6 bg-accent-success text-dark-bg font-bold rounded-lg
            hover:bg-accent-success/90 disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-accent-success focus:ring-offset-2 
            focus:ring-offset-dark-bg transition-all duration-200"
        >
          {isSaving ? 'Saving...' : '📖 Log Progress'}
        </button>
      </form>

      {/* Recent Logs Section */}
      <div className="mt-6 pt-6 border-t border-dark-border">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          📝 Today's Logs
        </h4>
        
        {isLoadingLogs ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No reading logs yet today. Start reading and log your progress!
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-gray-800/30 rounded-lg border border-dark-border/50 hover:border-dark-border transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {log.book_title}
                    </p>
                    <p className="text-accent-success text-sm">
                      {log.chapters_read} {log.chapters_read === 1 ? 'Chapter' : 'Chapters'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {log.key_learning && (
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                    "{log.key_learning}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
