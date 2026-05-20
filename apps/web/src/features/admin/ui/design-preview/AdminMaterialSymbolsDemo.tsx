'use client';

import { cn } from '@/lib/utils';

function MaterialSymbol({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('material-symbols-outlined align-middle leading-none', className)} aria-hidden="true">
      {name}
    </span>
  );
}

/**
 * Minimal client boundary so Material Symbols render in design preview (font from globals.css imports).
 */
export function AdminMaterialSymbolsDemo() {
  const names = ['dashboard', 'group', 'meeting_room', 'campaign', 'monitoring'];
  return (
    <div className="flex flex-wrap gap-4">
      {names.map((name) => (
        <div
          key={name}
          className="flex items-center gap-2 rounded-lg border border-admin-outline-variant/40 bg-admin-surface-elevated px-3 py-2 text-admin-on-surface"
        >
          <MaterialSymbol name={name} className="text-[20px] text-admin-primary" />
          <span className="admin-text-table-data">{name}</span>
        </div>
      ))}
    </div>
  );
}
