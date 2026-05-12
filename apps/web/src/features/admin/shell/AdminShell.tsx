'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import type { AdminNavGroup } from '@/features/admin/shell/nav-config';
import { IconChevronDown, IconChevronRight, IconMenu2, IconX } from '@tabler/icons-react';
import { stripLocalePrefix } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { AdminCommandPalette, type CommandPaletteLink } from '@/features/admin/shell/AdminCommandPalette';

const NAV_EXPANDED_KEY = 'tdarts.admin.nav.expanded.v1';

type AdminShellProps = {
  userLabel: string;
  navGroups: AdminNavGroup[];
  commandPaletteLinks?: CommandPaletteLink[];
  children: React.ReactNode;
};

function normalizeAdminPath(pathname: string): string {
  const p = pathname || '/';
  return stripLocalePrefix(p).replace(/\/$/, '') || '/';
}

function itemPath(href: string): string {
  return href.replace(/\/$/, '') || '/';
}

function groupHasActiveItem(group: AdminNavGroup, normalizedPath: string): boolean {
  return group.items.some((item) => {
    const itemPathNorm = itemPath(item.href);
    return (
      normalizedPath === itemPathNorm ||
      (itemPathNorm !== '/admin' && normalizedPath.startsWith(itemPathNorm + '/'))
    );
  });
}

export function AdminShell({ userLabel, navGroups, commandPaletteLinks = [], children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const navInitDone = useRef(false);

  const normalizedPath = useMemo(() => normalizeAdminPath(pathname || '/'), [pathname]);

  useEffect(() => {
    if (navInitDone.current) return;
    navInitDone.current = true;
    try {
      const raw = localStorage.getItem(NAV_EXPANDED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if (parsed && typeof parsed === 'object') {
          setExpanded(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    const next: Record<string, boolean> = {};
    for (const g of navGroups) {
      next[g.label] = groupHasActiveItem(g, normalizedPath);
    }
    setExpanded(next);
  }, [navGroups, normalizedPath]);

  /** Keep the active section visible when navigating (merge, do not collapse user-opened groups). */
  useEffect(() => {
    if (!navInitDone.current) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const g of navGroups) {
        if (groupHasActiveItem(g, normalizedPath)) next[g.label] = true;
      }
      return next;
    });
  }, [normalizedPath, navGroups]);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_EXPANDED_KEY, JSON.stringify(expanded));
    } catch {
      /* ignore */
    }
  }, [expanded]);

  const toggleGroup = useCallback((label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
      {navGroups.map((group) => {
        const isOpen = expanded[group.label] ?? false;
        return (
          <div key={group.label} className="rounded-lg border border-transparent">
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <IconChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              ) : (
                <IconChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              )}
              <span className="truncate">{group.label}</span>
            </button>
            <ul
              className={cn(
                'space-y-0.5 overflow-hidden pb-1 transition-[max-height] duration-200',
                isOpen ? 'max-h-[480px]' : 'max-h-0',
              )}
              aria-hidden={!isOpen}
            >
              {group.items.map((item) => {
                const itemPathNorm = itemPath(item.href);
                const active =
                  normalizedPath === itemPathNorm ||
                  (itemPathNorm !== '/admin' && normalizedPath.startsWith(itemPathNorm + '/'));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'block rounded-md px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-primary/15 font-medium text-primary'
                          : 'text-foreground/90 hover:bg-muted/60',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-card/40 lg:block">{nav}</aside>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-64 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <span className="text-sm font-semibold">Admin</span>
                <button
                  type="button"
                  className="rounded-md p-2 hover:bg-muted"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
              {nav}
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border/60 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <button
              type="button"
              className="rounded-md p-2 hover:bg-muted lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu2 className="h-5 w-5" />
            </button>
            <div className="text-sm font-semibold tracking-tight">tDarts Admin</div>
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="max-w-[40vw] truncate">{userLabel}</span>
              <Link href="/home" className="text-primary hover:underline">
                Exit
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-x-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      {commandPaletteLinks.length > 0 ? <AdminCommandPalette links={commandPaletteLinks} /> : null}
    </div>
  );
}
