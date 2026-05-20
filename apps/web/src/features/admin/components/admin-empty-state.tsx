import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface AdminEmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function AdminEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        'rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 border-dashed',
        className
      )}
    >
      <div className="p-4 rounded-full bg-admin-surface-elevated mb-4">
        <span className="material-symbols-outlined text-3xl text-admin-on-surface-variant">
          {icon}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-admin-on-surface mb-1">
        {title}
      </h3>
      <p className="text-sm text-admin-on-surface-variant max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        )
      )}
    </div>
  );
}
