'use client';
import React, { useState } from 'react';
import { IconHome, IconTrophy, IconUsers, IconSettings } from '@tabler/icons-react';

interface ClubLayoutProps {
  children: React.ReactNode;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  clubId: string;
  clubName: string;
  summary: React.ReactNode;
  players: React.ReactNode;
  tournaments: React.ReactNode;
  settings?: React.ReactNode;
  defaultPage?: 'summary' | 'players' | 'tournaments' | 'settings';
}

export default function ClubLayout({ userRole, clubName, summary, players, tournaments, settings, defaultPage = 'summary' }: ClubLayoutProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'players' | 'tournaments' | 'settings'>(defaultPage);

  const tabs = [
    { key: 'summary', label: 'Áttekintés', icon: <IconHome size={18} /> },
    { key: 'players', label: 'Játékosok', icon: <IconUsers size={18} /> },
    { key: 'tournaments', label: 'Versenyek', icon: <IconTrophy size={18} /> },
  ];
  if (userRole === 'admin' || userRole === 'moderator') {
    tabs.push({ key: 'settings', label: 'Beállítások', icon: <IconSettings size={18} /> });
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] bg-pattern">
      {/* Mobile-optimized Header */}
      <div className="relative h-40 md:h-64 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] overflow-hidden flex flex-col justify-end">
        <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-4 md:pb-6">
          <div className="flex flex-col gap-3 md:gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg tracking-tight">
                  {clubName}
                </h1>
              </div>
            </div>
            
            {/* Mobile-optimized Navigation */}
            <nav className="flex flex-wrap gap-1 md:gap-4 bg-[hsl(var(--background)/0.8)] rounded-xl p-2 shadow-lg backdrop-blur-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors duration-150 ${
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-md'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile-optimized Main content */}
      <div className="container mx-auto px-4 -mt-6 md:-mt-12 pb-8">
        <div className="bg-[hsl(var(--background))] rounded-2xl shadow-xl min-h-[calc(100vh-12rem)] p-4 md:p-8 card-section">
          {activeTab === 'summary' && summary}
          {activeTab === 'players' && players}
          {activeTab === 'tournaments' && tournaments}
          {activeTab === 'settings' && settings}
        </div>
      </div>
    </div>
  );
}