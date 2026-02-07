import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atomic Life - Personal Habit Dashboard',
  description: 'Build better habits, one atom at a time. Based on Atomic Habits by James Clear.',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-dark-bg text-white antialiased">
        {children}
      </body>
    </html>
  );
}
