'use client';

import { useState, useEffect } from 'react';
import { getGreeting, formatDate } from '@/lib/time-utils';

/**
 * IdentityHeader Component
 * Displays a dynamic greeting that reinforces the user's target identity
 * based on the time of day.
 * 
 * Props:
 * - name: The user's name to display in the greeting (default: 'Nimrod')
 */
interface IdentityHeaderProps {
  name?: string;
}

export default function IdentityHeader({ name = 'Nimrod' }: IdentityHeaderProps) {
  const [greeting, setGreeting] = useState('');
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // Set initial values
    setGreeting(getGreeting());
    setFormattedDate(formatDate(new Date()));

    // Update greeting every minute to handle time changes
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setFormattedDate(formatDate(new Date()));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Replace the generic identity with the user's name
  const personalizedGreeting = greeting.replace('Friend', name);

  return (
    <header className="text-center py-6 px-4">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
        {personalizedGreeting}
      </h1>
      <p className="text-gray-400 text-sm md:text-base">
        {formattedDate}
      </p>
    </header>
  );
}
