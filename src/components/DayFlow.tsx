'use client';

import { useState, useEffect } from 'react';
import { DayPlan, getDayPlanForDate, insertDayPlanItem, updateDayPlanItemComplete, deleteDayPlanItem } from '@/lib/supabase';

interface DayFlowProps {
  onUpdate?: () => void;
}

/**
 * DayFlow Component - Time-Blocking Planner
 * A simplified list for planning the day's schedule
 */
export default function DayFlow({ onUpdate }: DayFlowProps) {
  const [viewMode, setViewMode] = useState<'today' | 'tomorrow'>('today');
  const [tasks, setTasks] = useState<DayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTime, setNewTime] = useState('08:00');
  const [newTask, setNewTask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const selectedDate = viewMode === 'today' ? today : tomorrow;

  // Fetch tasks for selected date
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getDayPlanForDate(selectedDate);
      
      if (error) {
        console.warn('Error fetching day plan:', error);
      }
      
      setTasks(data || []);
    } catch (err) {
      console.warn('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  // Add new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsAdding(true);
    try {
      // Default end time to 1 hour after start
      const [hours, minutes] = newTime.split(':').map(Number);
      const endHours = hours + 1;
      const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      const { error } = await insertDayPlanItem({
        title: newTask.trim(),
        start_time: newTime,
        end_time: endTime,
        date: selectedDate
      });

      if (error) throw error;

      setNewTask('');
      setNewTime('08:00');
      fetchTasks();
      onUpdate?.();
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle task completion
  const handleToggleComplete = async (task: DayPlan) => {
    try {
      const { error } = await updateDayPlanItemComplete(task.id, !task.is_complete);
      
      if (error) throw error;

      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, is_complete: !t.is_complete } : t
      ));
      
      onUpdate?.();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await deleteDayPlanItem(taskId);
      
      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">📅 Day Flow</h2>
        
        {/* Today/Tomorrow Toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'today'
                ? 'bg-accent-info text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode('tomorrow')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'tomorrow'
                ? 'bg-accent-info text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tomorrow
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="mb-6">
        <div className="flex gap-3">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent"
          />
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-accent-success focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isAdding || !newTask.trim()}
            className="px-6 py-3 bg-accent-success text-dark-bg font-bold rounded-lg
              hover:bg-accent-success/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            {isAdding ? '...' : '+'}
          </button>
        </div>
      </form>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-800 rounded-lg"></div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks planned for {viewMode}</p>
          <p className="text-sm mt-1">Add one above to start your day flow</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                task.is_complete
                  ? 'bg-green-500/5 border-green-500/20 opacity-60'
                  : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleComplete(task)}
                className={`flex-shrink-0 w-6 h-6 rounded border-2 transition-all ${
                  task.is_complete
                    ? 'bg-accent-success border-accent-success'
                    : 'border-gray-500 hover:border-accent-success'
                }`}
              >
                {task.is_complete && (
                  <svg className="w-full h-full text-dark-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Time */}
              <div className="flex-shrink-0 w-20">
                <p className="text-blue-400 font-medium">{formatTime(task.start_time)}</p>
              </div>

              {/* Task Title */}
              <div className="flex-1">
                <p className={`text-white ${task.is_complete ? 'line-through' : ''}`}>
                  {task.title}
                </p>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {tasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-dark-border">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {tasks.filter(t => t.is_complete).length} of {tasks.length} completed
            </span>
            <span className="text-accent-info">
              {Math.round((tasks.filter(t => t.is_complete).length / tasks.length) * 100)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-success transition-all duration-300"
              style={{
                width: `${(tasks.filter(t => t.is_complete).length / tasks.length) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
