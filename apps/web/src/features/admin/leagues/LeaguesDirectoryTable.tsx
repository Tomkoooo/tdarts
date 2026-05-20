'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminLeagueListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminListParams } from '@/features/admin/lib/list-params';

const columns: ColumnDef<AdminLeagueListRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Név',
    meta: { sortKey: 'name' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'clubName',
    header: 'Klub',
    meta: { sortKey: 'club' },
  },
  {
    accessorKey: 'playersCount',
    header: 'Játékosok',
    meta: { sortKey: 'players' },
  },
  {
    accessorKey: 'tournamentsAttached',
    header: 'Versenyek',
    meta: { sortKey: 'tournaments' },
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
  rows: AdminLeagueListRow[];
  total: number;
  params: AdminListParams;
};

export function LeaguesDirectoryTable({ rows, total, params }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/leagues"
      emptyLabel="Nincs liga."
      onRowHref={(row) => `/admin/leagues/${row._id}`}
    />
  );
}
