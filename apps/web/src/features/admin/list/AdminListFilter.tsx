'use client';

import { useTransition } from 'react';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePathname, useRouter } from '@/i18n/routing';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';

type Option = { value: string; label: string };

type Props = {
  params: AdminListParams;
  paramKey: string;
  value: string;
  options: Option[];
  /** Visible label above the select */
  label: string;
  extra?: Record<string, string | undefined>;
};

export function AdminListFilter({
  params,
  paramKey,
  value,
  options,
  label,
  extra,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const id = `admin-filter-${paramKey}`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          const qs = buildListQueryString(params, {
            ...extra,
            [paramKey]: next,
            page: 1,
          });
          startTransition(() => router.replace(`${pathname}${qs}`));
        }}
      >
        <SelectTrigger id={id} className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
