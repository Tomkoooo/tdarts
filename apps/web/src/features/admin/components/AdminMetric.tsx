import React from 'react';
import { Link } from '@/i18n/routing';
import {
  IconBuilding,
  IconChartBar,
  IconTrophy,
  IconUser,
  IconUsers,
  type TablerIcon,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

const entityIcon: Record<string, TablerIcon> = {
  user: IconUser,
  users: IconUsers,
  club: IconBuilding,
  tournament: IconTrophy,
  default: IconChartBar,
};

export type AdminMetricFormat = 'count' | 'currency' | 'percent' | 'duration' | 'text';

function formatValue(value: React.ReactNode, fmt: AdminMetricFormat): React.ReactNode {
  if (fmt === 'text' || value === null || value === undefined || typeof value !== 'number') {
    return value;
  }
  if (fmt === 'count') {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  }
  if (fmt === 'currency') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(
      value,
    );
  }
  if (fmt === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (fmt === 'duration') {
    if (value < 1000) return `${Math.round(value)} ms`;
    return `${(value / 1000).toFixed(1)} s`;
  }
  return value;
}

export type AdminMetricProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Visual hint only — icon and accent */
  entity?: 'user' | 'users' | 'club' | 'tournament' | 'default';
  format?: AdminMetricFormat;
  href?: string;
  skeleton?: boolean;
  trend?: React.ReactNode;
  className?: string;
};

export function AdminMetric({
  label,
  value,
  hint,
  entity = 'default',
  format = 'count',
  href,
  skeleton,
  trend,
  className,
}: AdminMetricProps) {
  const Icon = entityIcon[entity] ?? entityIcon.default;
  const inner = (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card/50 p-4 shadow-sm transition-colors',
        href && !skeleton && 'hover:border-primary/30 hover:bg-card/80',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>
      {skeleton ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-muted/60" />
      ) : (
        <div className="mt-1 text-2xl font-semibold tabular-nums">{formatValue(value, format)}</div>
      )}
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      {trend ? <div className="mt-2 border-t border-border/40 pt-2">{trend}</div> : null}
    </div>
  );

  if (href && !skeleton) {
    return (
      <Link href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        {inner}
      </Link>
    );
  }

  return inner;
}
