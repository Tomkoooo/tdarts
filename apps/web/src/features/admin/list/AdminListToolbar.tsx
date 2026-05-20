import { cn } from '@/lib/utils';

export function AdminListToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>{children}</div>
  );
}
