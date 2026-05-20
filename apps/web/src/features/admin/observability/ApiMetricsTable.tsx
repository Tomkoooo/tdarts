'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type Row = {
  _id: string;
  routeKey: string;
  method: string;
  count: number;
  errorCount: number;
  bucket?: string;
};

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: 'bucket',
    header: 'Bucket',
    cell: ({ row }) => formatAdminDate(row.original.bucket),
  },
  {
    accessorKey: 'routeKey',
    header: 'Útvonal',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.routeKey}</span>,
  },
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'count', header: 'Hívások' },
  { accessorKey: 'errorCount', header: 'Hibák' },
];

type Props = {
  metrics: Record<string, unknown>[];
};

export function ApiMetricsTable({ metrics }: Props) {
  const rows: Row[] = metrics.map((m) => ({
    _id: String(m._id ?? m.routeKey ?? Math.random()),
    routeKey: String(m.routeKey ?? ''),
    method: String(m.method ?? ''),
    count: Number(m.count) || 0,
    errorCount: Number(m.errorCount) || 0,
    bucket: m.bucket instanceof Date ? m.bucket.toISOString() : m.bucket ? String(m.bucket) : undefined,
  }));

  const params = { page: 1, limit: rows.length || 20 };

  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={rows.length}
      params={params}
      basePath="/admin/observability/api"
      emptyLabel="Nincs telemetria adat."
    />
  );
}
