'use client';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
}

export default function ClubLayout({ children, userRole, clubId, clubName, summary, players, tournaments, settings }: ClubLayoutProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'players' | 'tournaments' | 'settings'>('summary');

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
      {/* Header */}
      <div className="relative h-56 md:h-64 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] overflow-hidden flex flex-col justify-end">
        <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg tracking-tight mb-2 md:mb-0">{clubName}</h1>
            {/* Local Tabs */}
            <nav className="flex flex-wrap gap-2 md:gap-4 bg-[hsl(var(--background)/0.7)] rounded-xl p-2 shadow-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-colors duration-150 ${
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-md'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 -mt-8 md:-mt-12">
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