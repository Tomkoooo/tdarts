'use client';

import React, { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import type { AdminNavGroup } from '@/features/admin/shell/nav-config';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { stripLocalePrefix } from '@/lib/seo';

type AdminShellProps = {
  userLabel: string;
  navGroups: AdminNavGroup[];
  children: React.ReactNode;
};

export function AdminShell({ userLabel, navGroups, children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const normalizedPath = useMemo(() => {
    const p = pathname || '/';
    return stripLocalePrefix(p).replace(/\/$/, '') || '/';
  }, [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const itemPath = item.href.replace(/\/$/, '') || '/';
              const active =
                normalizedPath === itemPath ||
                (itemPath !== '/admin' && normalizedPath.startsWith(itemPath + '/'));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? 'bg-primary/15 font-medium text-primary'
                        : 'text-foreground/90 hover:bg-muted/60'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
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
    </div>
  );
}
