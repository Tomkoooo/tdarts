'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ADMIN_NAV_GROUPS,
  filterNavByCapabilities,
  type AdminNavGroup,
} from '../lib/admin-nav-items';
import type { AdminCapability } from '@tdarts/services';
import {
  IconChevronDown,
  IconChevronRight,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';

interface AdminSidebarProps {
  locale: string;
  capabilities: AdminCapability[];
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AdminSidebar({
  locale,
  capabilities,
  collapsed = false,
  onToggle,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['Overview', 'Content'])
  );

  const filteredGroups = filterNavByCapabilities(ADMIN_NAV_GROUPS, capabilities);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === '/admin') {
      return pathname === fullHref;
    }
    return pathname.startsWith(fullHref);
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-admin-surface-sunken border-r border-admin-outline-variant/30 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-admin-outline-variant/30">
        {!collapsed && (
          <Link
            href={`/${locale}/admin`}
            className="flex items-center gap-2 text-admin-primary font-semibold"
          >
            <span className="material-symbols-outlined text-xl">target</span>
            <span className="font-headline text-lg">tDarts Admin</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <IconMenu2 className="w-5 h-5" />
          ) : (
            <IconX className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 admin-scrollbar">
        {filteredGroups.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            locale={locale}
            collapsed={collapsed}
            expanded={expandedGroups.has(group.label)}
            onToggle={() => toggleGroup(group.label)}
            isActive={isActive}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-admin-outline-variant/30">
          <p className="text-xs text-admin-on-surface-variant/60 admin-text-mono-data">
            tDarts Admin v1.0
          </p>
        </div>
      )}
    </aside>
  );
}

interface NavGroupProps {
  group: AdminNavGroup;
  locale: string;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
}

function NavGroup({
  group,
  locale,
  collapsed,
  expanded,
  onToggle,
  isActive,
}: NavGroupProps) {
  if (collapsed) {
    // In collapsed mode, show only icons without group headers
    return (
      <div className="px-2 py-1">
        {group.items.map((item) => (
          <Link
            key={item.href}
            href={`/${locale}${item.href}`}
            className={cn(
              'flex items-center justify-center w-full h-10 rounded-md mb-1 transition-all',
              isActive(item.href)
                ? 'bg-admin-primary/15 text-admin-primary'
                : 'text-admin-on-surface-variant hover:bg-admin-surface-container hover:text-admin-on-surface'
            )}
            title={item.label}
          >
            <span className="material-symbols-outlined text-xl">
              {item.icon}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2">
      {/* Group Header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium uppercase tracking-wider text-admin-on-surface-variant/70 hover:text-admin-on-surface-variant transition-colors"
      >
        <span>{group.label}</span>
        {expanded ? (
          <IconChevronDown className="w-4 h-4" />
        ) : (
          <IconChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Group Items */}
      {expanded && (
        <div className="px-2 animate-fade-in">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-md mb-0.5 transition-all text-sm',
                isActive(item.href)
                  ? 'bg-admin-primary/15 text-admin-primary font-medium'
                  : 'text-admin-on-surface-variant hover:bg-admin-surface-container hover:text-admin-on-surface'
              )}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-admin-primary/20 text-admin-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
