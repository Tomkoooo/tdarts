'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';

/** Syncs missing sort/dir into the URL so lists have a stable default order. */
export function AdminListParamsRedirect({
  params,
  extraQuery,
}: {
  params: AdminListParams;
  extraQuery?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('sort') && searchParams.get('dir')) return;
    const qs = buildListQueryString(params, extraQuery ?? {});
    router.replace(`${pathname}${qs}`);
  }, [pathname, params, extraQuery, router, searchParams]);

  return null;
}
