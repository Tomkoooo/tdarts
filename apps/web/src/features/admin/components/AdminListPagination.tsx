'use client';

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  total: number;
  params: AdminListParams;
  basePath: string;
  extraQuery?: Record<string, string | undefined>;
  /** Prefix for page param when paginating nested lists, e.g. `matchPage` */
  pageParamKey?: string;
  page?: number;
  limit?: number;
  className?: string;
};

export function AdminListPagination({
  total,
  params,
  basePath,
  extraQuery,
  pageParamKey,
  page: pageOverride,
  limit: limitOverride,
  className,
}: Props) {
  const page = pageOverride ?? params.page;
  const limit = limitOverride ?? params.limit;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  const patch = (nextPage: number) => {
    if (pageParamKey) return { ...extraQuery, [pageParamKey]: String(nextPage) };
    return { ...extraQuery, page: nextPage };
  };

  const qs = (nextPage: number) =>
    buildListQueryString(
      pageParamKey ? params : { ...params, page: nextPage },
      patch(nextPage) as Partial<AdminListParams & Record<string, string | undefined>>,
    );

  const prevHref = page > 1 ? `${basePath}${qs(page - 1)}` : undefined;
  const nextHref = page < pageCount ? `${basePath}${qs(page + 1)}` : undefined;

  return (
    <div className={`flex items-center justify-between gap-2 text-sm ${className ?? ''}`}>
      <span className="text-muted-foreground text-xs">
        {total} elem · {page}. / {pageCount} oldal
      </span>
      <div className="flex items-center gap-1">
        {prevHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={prevHref}>
              <IconChevronLeft className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <IconChevronLeft className="size-4" />
          </Button>
        )}
        {nextHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={nextHref}>
              <IconChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <IconChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
