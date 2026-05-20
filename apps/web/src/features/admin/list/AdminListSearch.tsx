'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/ui/Input';
import { usePathname, useRouter } from '@/i18n/routing';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  params: AdminListParams;
  placeholder: string;
  extra?: Record<string, string | undefined>;
};

export function AdminListSearch({ params, placeholder, extra }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(params.q ?? '');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(params.q ?? '');
  }, [params.q]);

  const pushQuery = useCallback(
    (q: string) => {
      const qs = buildListQueryString(params, { ...extra, q: q || undefined, page: 1 });
      startTransition(() => {
        router.replace(`${pathname}${qs}`);
      });
    },
    [extra, params, pathname, router],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.q ?? '') === value) return;
      pushQuery(value);
    }, 400);
    return () => clearTimeout(t);
  }, [value, params.q, pushQuery]);

  return (
    <div className="relative max-w-sm flex-1">
      <IconSearch className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
