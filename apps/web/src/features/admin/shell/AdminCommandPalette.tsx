'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type CommandPaletteLink = { href: string; label: string };

export function AdminCommandPalette({ links }: { links: CommandPaletteLink[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return links.slice(0, 12);
    return links.filter((l) => l.label.toLowerCase().includes(s) || l.href.toLowerCase().includes(s)).slice(0, 20);
  }, [links, q]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQ('');
      router.push(href);
    },
    [router],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm">Jump to…</DialogTitle>
          <p className="text-xs text-muted-foreground">⌘K / Ctrl+K</p>
        </DialogHeader>
        <div className="px-3 pb-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter admin pages"
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
          <ul className="mt-2 max-h-72 overflow-y-auto text-sm">
            {filtered.map((l) => (
              <li key={l.href}>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2 py-2 text-left hover:bg-muted/60"
                  onClick={() => navigate(l.href)}
                >
                  {l.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? <li className="px-2 py-4 text-muted-foreground">No matches</li> : null}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: use the sidebar for full navigation. This palette lists your allowed routes only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
