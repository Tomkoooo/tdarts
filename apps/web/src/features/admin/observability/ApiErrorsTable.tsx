'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTransition } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminResolveErrorEventAction } from '@/features/admin/observability/actions';
import type { AdminListParams } from '@/features/admin/lib/list-params';
import { Link } from '@/i18n/routing';
import toast from 'react-hot-toast';

type Row = {
  _id: string;
  routeKey: string;
  method: string;
  statusCode?: number;
  isResolved: boolean;
  occurredAt?: string;
};

function ResolveButton({
  locale,
  id,
  resolved,
}: {
  locale: string;
  id: string;
  resolved: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          const r = await adminResolveErrorEventAction(locale, id, !resolved);
          if (r.ok) toast.success(resolved ? 'Újranyitva' : 'Megoldva');
          else toast.error(r.error ?? 'Hiba');
        });
      }}
    >
      {resolved ? 'Újranyit' : 'Megold'}
    </Button>
  );
}

export function ApiErrorsTable({
  locale,
  events,
  params,
  extraQuery,
}: {
  locale: string;
  events: Record<string, unknown>[];
  params: AdminListParams;
  extraQuery?: Record<string, string | undefined>;
}) {
  const rows: Row[] = events.map((e) => ({
    _id: String(e._id ?? ''),
    routeKey: String(e.routeKey ?? ''),
    method: String(e.method ?? ''),
    statusCode: e.statusCode != null ? Number(e.statusCode) : undefined,
    isResolved: Boolean(e.isResolved),
    occurredAt:
      e.occurredAt instanceof Date
        ? e.occurredAt.toISOString()
        : e.occurredAt
          ? String(e.occurredAt)
          : undefined,
  }));

  const columns: ColumnDef<Row, unknown>[] = [
    {
      accessorKey: 'occurredAt',
      header: 'Idő',
      cell: ({ row }) => formatAdminDate(row.original.occurredAt),
    },
    {
      accessorKey: 'routeKey',
      header: 'Útvonal',
      cell: ({ row }) => (
        <Link href={`/admin/observability/errors/${row.original._id}`} className="font-mono text-xs hover:underline">
          {row.original.routeKey}
        </Link>
      ),
    },
    { accessorKey: 'method', header: 'Method' },
    { accessorKey: 'statusCode', header: 'HTTP' },
    {
      id: 'status',
      header: 'Státusz',
      cell: ({ row }) =>
        row.original.isResolved ? (
          <Badge variant="secondary">Megoldva</Badge>
        ) : (
          <Badge variant="destructive">Nyitott</Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ResolveButton locale={locale} id={row.original._id} resolved={row.original.isResolved} />
      ),
    },
  ];

  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={rows.length}
      params={params}
      basePath="/admin/observability/errors"
      emptyLabel="Nincs API hiba esemény."
      extraQuery={extraQuery}
    />
  );
}
