'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminClubListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminClubsListParams } from '@/features/admin/clubs/actions';

const columns: ColumnDef<AdminClubListRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Név',
    meta: { sortKey: 'name' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: 'location',
    header: 'Hely',
    cell: ({ row }) =>
      [row.original.city, row.original.country].filter(Boolean).join(', ') || '—',
  },
  {
    accessorKey: 'subscriptionModel',
    header: 'Csomag',
    meta: { sortKey: 'subscription' },
  },
  {
    accessorKey: 'membersCount',
    header: 'Tagok',
    meta: { sortKey: 'members' },
  },
  {
    id: 'status',
    header: 'Státusz',
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.verified ? <Badge variant="secondary">Verified</Badge> : null}
        {!row.original.isActive ? <Badge variant="outline">Inaktív</Badge> : null}
      </div>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Frissítve',
    meta: { sortKey: 'updated' },
    cell: ({ row }) => formatAdminDate(row.original.updatedAt),
  },
];

type Props = {
  rows: AdminClubListRow[];
  total: number;
  params: AdminClubsListParams;
  extraQuery?: Record<string, string | undefined>;
};

export function ClubsDirectoryTable({ rows, total, params, extraQuery }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/clubs"
      emptyLabel="Nincs klub."
      extraQuery={extraQuery}
      onRowHref={(row) => `/admin/clubs/${row._id}`}
    />
  );
}
