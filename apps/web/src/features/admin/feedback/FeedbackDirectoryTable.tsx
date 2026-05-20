'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminFeedbackListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import {
  getFeedbackPriorityBadgeVariant,
  getFeedbackStatusBadgeVariant,
} from '@/features/admin/lib/status-badges';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminFeedbackListParams } from '@/features/admin/feedback/actions';

const columns: ColumnDef<AdminFeedbackListRow, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Tárgy',
    meta: { sortKey: 'title' },
    cell: ({ row }) => (
      <span className="font-medium">
        {!row.original.isReadByAdmin ? (
          <span className="bg-primary mr-2 inline-block size-2 rounded-full" aria-hidden />
        ) : null}
        {row.original.title}
      </span>
    ),
  },
  { accessorKey: 'email', header: 'Email', meta: { sortKey: 'email' } },
  { accessorKey: 'category', header: 'Kategória', meta: { sortKey: 'category' } },
  {
    accessorKey: 'priority',
    header: 'Prioritás',
    meta: { sortKey: 'priority' },
    cell: ({ row }) => (
      <Badge variant={getFeedbackPriorityBadgeVariant(row.original.priority)}>
        {row.original.priority}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Státusz',
    meta: { sortKey: 'status' },
    cell: ({ row }) => (
      <Badge variant={getFeedbackStatusBadgeVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Létrehozva',
    meta: { sortKey: 'created' },
    cell: ({ row }) => formatAdminDate(row.original.createdAt),
  },
];

type Props = {
  rows: AdminFeedbackListRow[];
  total: number;
  params: AdminFeedbackListParams;
  extraQuery?: Record<string, string | undefined>;
  onRowClick?: (row: AdminFeedbackListRow) => void;
};

export function FeedbackDirectoryTable({ rows, total, params, extraQuery, onRowClick }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/support/feedback"
      emptyLabel="Nincs visszajelzés."
      extraQuery={extraQuery}
      onRowHref={onRowClick ? undefined : (row) => `/admin/support/feedback/${row._id}`}
      onRowClick={onRowClick}
    />
  );
}
