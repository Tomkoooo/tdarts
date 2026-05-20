'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  IconBell,
  IconSearch,
  IconChevronRight,
  IconExternalLink,
} from '@tabler/icons-react';

interface AdminHeaderProps {
  locale: string;
  userName?: string;
  userEmail?: string;
}

export function AdminHeader({ locale, userName, userEmail }: AdminHeaderProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const breadcrumbs = generateBreadcrumbs(pathname, locale);

  return (
    <header className="h-16 bg-admin-surface border-b border-admin-outline-variant/30 flex items-center justify-between px-6">
      {/* Left: Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && (
              <IconChevronRight className="w-4 h-4 text-admin-on-surface-variant/50" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-admin-on-surface font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface hover:bg-admin-surface-elevated transition-colors text-sm"
          aria-label="Search"
        >
          <IconSearch className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 text-xs rounded bg-admin-surface-sunken border border-admin-outline-variant/30">
            /
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-md text-admin-on-surface-variant hover:text-admin-on-surface hover:bg-admin-surface-container transition-colors"
          aria-label="Notifications"
        >
          <IconBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-admin-primary" />
        </button>

        {/* Back to Site */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-admin-on-surface-variant hover:text-admin-on-surface hover:bg-admin-surface-container transition-colors text-sm"
        >
          <span>Exit Admin</span>
          <IconExternalLink className="w-4 h-4" />
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-admin-outline-variant/30">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-admin-on-surface">
              {userName || 'Admin'}
            </p>
            {userEmail && (
              <p className="text-xs text-admin-on-surface-variant">
                {userEmail}
              </p>
            )}
          </div>
          <div className="w-9 h-9 rounded-full bg-admin-primary/20 flex items-center justify-center text-admin-primary font-semibold text-sm">
            {(userName || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

interface Breadcrumb {
  label: string;
  href: string;
}

function generateBreadcrumbs(pathname: string, locale: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    { label: 'Admin', href: `/${locale}/admin` },
  ];

  // Remove locale prefix and /admin prefix
  const path = pathname.replace(`/${locale}/admin`, '');
  if (!path || path === '/') {
    return crumbs;
  }

  const segments = path.split('/').filter(Boolean);
  let currentPath = `/${locale}/admin`;

  for (const segment of segments) {
    currentPath += `/${segment}`;
    // Capitalize and format segment
    const label = formatSegmentLabel(segment);
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

function formatSegmentLabel(segment: string): string {
  // Handle MongoDB-style IDs
  if (/^[a-f0-9]{24}$/i.test(segment)) {
    return 'Detail';
  }
  // Handle UUIDs
  if (/^[a-f0-9-]{36}$/i.test(segment)) {
    return 'Detail';
  }
  // Capitalize words
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
