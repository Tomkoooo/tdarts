import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  pageHeaderAction?: React.ReactNode;
  className?: string;
};

/** Adapted from next-shadcn-dashboard-starter `page-container.tsx`. */
export function AdminPageContainer({
  children,
  pageTitle,
  pageDescription,
  pageHeaderAction,
  className,
}: Props) {
  const hasHeader = pageTitle || pageHeaderAction;

  return (
    <div className={cn('flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4', className)}>
      {hasHeader ? (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {pageTitle ? <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1> : null}
            {pageDescription ? (
              <p className="text-sm text-muted-foreground">{pageDescription}</p>
            ) : null}
          </div>
          {pageHeaderAction ? <div className="shrink-0">{pageHeaderAction}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
