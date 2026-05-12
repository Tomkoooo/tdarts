'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const ranges = ['24h', '7d', '30d'] as const;

export function AdminChartCard({
  title,
  description,
  children,
  isEmpty,
  isLoading,
  className,
  onRangeChange,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  isLoading?: boolean;
  className?: string;
  /** Fired when user picks a preset range (wire to refetch in parent). */
  onRangeChange?: (range: (typeof ranges)[number]) => void;
}) {
  const [range, setRange] = useState<(typeof ranges)[number]>('7d');

  return (
    <section className={cn('rounded-xl border border-border/60 bg-card/40 p-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex rounded-md border border-border/60 bg-background/80 p-0.5 text-xs">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              className={cn(
                'rounded px-2 py-1 transition-colors',
                range === r ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setRange(r);
                onRangeChange?.(r);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 min-h-[200px]">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
        ) : isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No data in range</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
