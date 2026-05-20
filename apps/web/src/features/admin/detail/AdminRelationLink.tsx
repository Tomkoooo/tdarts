import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  label: string;
  sublabel?: string;
  className?: string;
};

/** Relation target with human-readable label; id only as secondary hint. */
export function AdminRelationLink({ href, label, sublabel, className }: Props) {
  return (
    <Link
      href={href}
      className={cn('text-primary inline-flex flex-col gap-0.5 hover:underline', className)}
    >
      <span className="font-medium">{label}</span>
      {sublabel ? (
        <span className="text-muted-foreground font-mono text-xs">{sublabel}</span>
      ) : null}
    </Link>
  );
}
