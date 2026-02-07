// Time utility functions for Atomic Life

// Time windows configuration
export const TIME_WINDOWS = {
  // 6 AM Victory window (default: 05:45 - 06:15)
  morning: {
    defaultStart: { hours: 5, minutes: 45 },  // 05:45 AM
    defaultEnd: { hours: 6, minutes: 15 },    // 06:15 AM
    fallbackStart: { hours: 7, minutes: 15 }, // 07:15 AM (Meeting Mode fallback)
    fallbackEnd: { hours: 7, minutes: 45 }   // 07:45 AM
  },
  // Identity greeting hours
  greetings: [
    { startHour: 5, endHour: 8, identity: 'Athlete' },
    { startHour: 8, endHour: 18, identity: 'Engineer' },
    { startHour: 18, endHour: 22, identity: 'Scholar' },
    { startHour: 22, endHour: 24, identity: 'Recover' },
    { startHour: 0, endHour: 5, identity: 'Recover' }
  ],
  // Evening shutdown time (10 PM)
  eveningShutdown: { hours: 22, minutes: 0 }
};

// Convert hours/minutes to minutes from midnight
function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

// Get current time in minutes from midnight
function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Check if current time is within the 6 AM Victory window
 * @param isMeetingMode - Whether Meeting Mode is enabled (uses fallback window)
 * @returns Object with inWindow boolean and state string
 */
export function isWithinTimeWindow(isMeetingMode: boolean = false): {
  inWindow: boolean;
  state: 'active' | 'missed' | 'fallback';
} {
  const currentMinutes = getCurrentMinutes();
  
  const window = isMeetingMode
    ? {
        start: toMinutes(TIME_WINDOWS.morning.fallbackStart.hours, TIME_WINDOWS.morning.fallbackStart.minutes),
        end: toMinutes(TIME_WINDOWS.morning.fallbackEnd.hours, TIME_WINDOWS.morning.fallbackEnd.minutes)
      }
    : {
        start: toMinutes(TIME_WINDOWS.morning.defaultStart.hours, TIME_WINDOWS.morning.defaultStart.minutes),
        end: toMinutes(TIME_WINDOWS.morning.defaultEnd.hours, TIME_WINDOWS.morning.defaultEnd.minutes)
      };

  if (currentMinutes >= window.start && currentMinutes <= window.end) {
    return {
      inWindow: true,
      state: isMeetingMode ? 'fallback' : 'active'
    };
  }
  
  return { inWindow: false, state: 'missed' };
}

/**
 * Get dynamic greeting based on time of day
 * Reinforces the user's target identity
 */
export function getGreeting(): string {
  const currentHour = new Date().getHours();
  
  const greeting = TIME_WINDOWS.greetings.find(
    g => currentHour >= g.startHour && currentHour < g.endHour
  );
  
  const timeOfDay = currentHour >= 5 && currentHour < 12 
    ? 'Morning' 
    : currentHour >= 12 && currentHour < 17 
      ? 'Afternoon' 
      : currentHour < 22 
        ? 'Evening' 
        : 'Night';
  
  return `Good ${timeOfDay}, ${greeting?.identity || 'Friend'}.`;
}

/**
 * Check if current time is past evening shutdown (10 PM)
 */
export function isPastEveningShutdown(): boolean {
  const currentMinutes = getCurrentMinutes();
  const shutdownMinutes = toMinutes(
    TIME_WINDOWS.eveningShutdown.hours,
    TIME_WINDOWS.eveningShutdown.minutes
  );
  return currentMinutes >= shutdownMinutes;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get time until next morning victory window opens
 */
export function getTimeUntilNextWindow(isMeetingMode: boolean = false): {
  hours: number;
  minutes: number;
  isTomorrow: boolean;
} {
  const currentMinutes = getCurrentMinutes();
  const window = isMeetingMode
    ? toMinutes(TIME_WINDOWS.morning.fallbackStart.hours, TIME_WINDOWS.morning.fallbackStart.minutes)
    : toMinutes(TIME_WINDOWS.morning.defaultStart.hours, TIME_WINDOWS.morning.defaultStart.minutes);
  
  if (currentMinutes < window) {
    const diff = window - currentMinutes;
    return {
      hours: Math.floor(diff / 60),
      minutes: diff % 60,
      isTomorrow: false
    };
  }
  
  // Window already passed today, calculate for tomorrow
  const minutesUntilMidnight = 24 * 60 - currentMinutes;
  const diff = minutesUntilMidnight + window;
  return {
    hours: Math.floor(diff / 60),
    minutes: diff % 60,
    isTomorrow: true
  };
}
