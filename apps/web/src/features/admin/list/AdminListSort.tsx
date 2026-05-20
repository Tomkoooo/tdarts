'use client';

import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/Label';
import {
  buildListQueryString,
  type AdminListParams,
  type AdminListSortDir,
} from '@/features/admin/lib/list-params';

export type AdminSortOption = {
  value: string;
  label: string;
};

type Props = {
  params: AdminListParams;
  options: AdminSortOption[];
  extraQuery?: Record<string, string | undefined>;
};

export function AdminListSort({ params, options, extraQuery }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const replace = (patch: Partial<AdminListParams>) => {
    const qs = buildListQueryString(params, { ...extraQuery, ...patch, page: 1 });
    const current = searchParams.toString();
    const next = qs.startsWith('?') ? qs.slice(1) : qs;
    if (current === next) return;
    router.replace(`${pathname}${qs}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-list-sort" className="text-muted-foreground text-xs">
          Rendezés
        </Label>
        <select
          id="admin-list-sort"
          className="border-border bg-background min-w-[10rem] rounded-md border px-2 py-1.5 text-sm"
          value={params.sort ?? options[0]?.value ?? ''}
          onChange={(e) => replace({ sort: e.target.value })}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-list-dir" className="text-muted-foreground text-xs">
          Irány
        </Label>
        <select
          id="admin-list-dir"
          className="border-border bg-background rounded-md border px-2 py-1.5 text-sm"
          value={params.dir ?? 'desc'}
          onChange={(e) => replace({ dir: e.target.value as AdminListSortDir })}
        >
          <option value="desc">Csökkenő</option>
          <option value="asc">Növekvő</option>
        </select>
      </div>
    </div>
  );
}
