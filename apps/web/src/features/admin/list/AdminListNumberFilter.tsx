'use client';

import { useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { usePathname, useRouter } from '@/i18n/routing';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  params: AdminListParams;
  paramKey: string;
  value: string;
  label: string;
  placeholder?: string;
  extra?: Record<string, string | undefined>;
};

export function AdminListNumberFilter({
  params,
  paramKey,
  value,
  label,
  placeholder,
  extra,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const id = `admin-num-filter-${paramKey}`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        className="w-[120px]"
        placeholder={placeholder}
        defaultValue={value}
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (next === (value ?? '')) return;
          const qs = buildListQueryString(params, {
            ...extra,
            [paramKey]: next || undefined,
            page: 1,
          });
          startTransition(() => router.replace(`${pathname}${qs}`));
        }}
      />
    </div>
  );
}
