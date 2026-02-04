import React from 'react';
import { User, Activity, Ticket } from 'lucide-react';

interface ProfileTabsProps {
  activeTab: 'details' | 'stats' | 'tickets';
  onTabChange: (tab: 'details' | 'stats' | 'tickets') => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
      <button
        onClick={() => onTabChange('details')}
        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
          activeTab === 'details'
            ? 'text-accent'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <User className="w-4 h-4" />
        Adatok
        {activeTab === 'details' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>

      <button
        onClick={() => onTabChange('stats')}
        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
          activeTab === 'stats'
            ? 'text-accent'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Activity className="w-4 h-4" />
        Statisztikák
        {activeTab === 'stats' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>

      <button
        onClick={() => onTabChange('tickets')}
        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
          activeTab === 'tickets'
            ? 'text-accent'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Ticket className="w-4 h-4" />
        Ticketek
        {activeTab === 'tickets' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>
    </div>
  );
}
