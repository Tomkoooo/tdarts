'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/Badge';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type LogRow = {
  _id: string;
  level?: string;
  category?: string;
  operation?: string;
  message?: string;
  timestamp?: string;
  requestId?: string;
};

const columns: ColumnDef<LogRow, unknown>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Idő',
    cell: ({ row }) => formatAdminDate(row.original.timestamp),
  },
  {
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.level === 'error'
            ? 'destructive'
            : row.original.level === 'warn'
              ? 'warning'
              : 'secondary'
        }
      >
        {row.original.level ?? '—'}
      </Badge>
    ),
  },
  { accessorKey: 'category', header: 'Kategória' },
  { accessorKey: 'operation', header: 'Művelet', cell: ({ row }) => (
    <span className="font-mono text-xs">{row.original.operation ?? '—'}</span>
  ) },
  {
    accessorKey: 'message',
    header: 'Üzenet',
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-md text-sm">{row.original.message ?? '—'}</span>
    ),
  },
];

type Props = {
  logs: Record<string, unknown>[];
  params: AdminListParams;
  extraQuery?: Record<string, string | undefined>;
};

export function ObservabilityLogsTable({ logs, params, extraQuery }: Props) {
  const rows: LogRow[] = logs.map((d) => ({
    _id: String(d._id ?? ''),
    level: d.level ? String(d.level) : undefined,
    category: d.category ? String(d.category) : undefined,
    operation: d.operation ? String(d.operation) : undefined,
    message: d.message ? String(d.message) : undefined,
    timestamp:
      d.timestamp instanceof Date
        ? d.timestamp.toISOString()
        : d.timestamp
          ? String(d.timestamp)
          : undefined,
    requestId: d.requestId ? String(d.requestId) : undefined,
  }));

  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={rows.length}
      params={params}
      basePath="/admin/observability/logs"
      emptyLabel="Nincs naplóbejegyzés."
      extraQuery={extraQuery}
    />
  );
}
