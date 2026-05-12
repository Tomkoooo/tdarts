import React from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function AdminPageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
  className,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {backHref ? (
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            ← {backLabel ?? 'Back'}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
