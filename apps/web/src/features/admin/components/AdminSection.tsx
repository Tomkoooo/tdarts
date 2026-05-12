import React from 'react';
import { cn } from '@/lib/utils';

export function AdminSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border/60 bg-card/40 p-4', className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}
