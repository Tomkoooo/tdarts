import { cn } from '@/lib/utils';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  className,
}: KpiCardProps) {
  // Determine trend from change if not explicitly provided
  const effectiveTrend = trend ?? (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : undefined);

  return (
    <div
      className={cn(
        'relative p-5 rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 overflow-hidden',
        className
      )}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-admin-primary/5 to-transparent opacity-50" />

      <div className="relative">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-admin-on-surface-variant font-medium">
            {title}
          </span>
          {icon && (
            <div className="p-2 rounded-lg bg-admin-surface-elevated text-admin-primary">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="admin-text-stats-lg text-admin-on-surface mb-2">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {/* Change indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium',
                effectiveTrend === 'up' && 'bg-admin-success/15 text-admin-success',
                effectiveTrend === 'down' && 'bg-admin-error/15 text-admin-error',
                effectiveTrend === 'neutral' && 'bg-admin-outline-variant/20 text-admin-on-surface-variant'
              )}
            >
              {effectiveTrend === 'up' && <IconTrendingUp className="w-3 h-3" />}
              {effectiveTrend === 'down' && <IconTrendingDown className="w-3 h-3" />}
              {effectiveTrend === 'neutral' && <IconMinus className="w-3 h-3" />}
              <span>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
            </div>
            {changeLabel && (
              <span className="text-xs text-admin-on-surface-variant">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
