import React from 'react';

interface ClubLayoutProps {
  children: React.ReactNode;
}

export default function ClubLayout({ children }: ClubLayoutProps) {
  return (
    <div className="w-full min-h-screen bg-[hsl(var(--background))] p-6 mt-16 flex">
      <div className="max-w-7xl mx-auto space-y-8">
        {children}
      </div>
    </div>
  );
}