'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import type { AdminCapability } from '@tdarts/services';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
  locale: string;
  capabilities: AdminCapability[];
  userName?: string;
  userEmail?: string;
}

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export function AdminShell({
  children,
  locale,
  capabilities,
  userName,
  userEmail,
}: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true') {
      setCollapsed(true);
    }
    setMounted(true);
  }, []);

  // Persist collapsed state
  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  // Prevent flash of incorrect sidebar state
  if (!mounted) {
    return (
      <div className="flex h-screen bg-admin-surface">
        <div className="w-[260px] bg-admin-surface-sunken border-r border-admin-outline-variant/30" />
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-admin-surface border-b border-admin-outline-variant/30" />
          <main className="flex-1 overflow-auto p-6 bg-admin-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-admin-surface overflow-hidden" data-admin-chrome>
      {/* Sidebar */}
      <AdminSidebar
        locale={locale}
        capabilities={capabilities}
        collapsed={collapsed}
        onToggle={handleToggle}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <AdminHeader locale={locale} userName={userName} userEmail={userEmail} />

        {/* Content */}
        <main
          className={cn(
            'flex-1 overflow-auto bg-admin-surface admin-scrollbar',
            'p-6'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
