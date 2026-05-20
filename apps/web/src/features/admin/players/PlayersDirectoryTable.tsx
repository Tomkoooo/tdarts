'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminPlayerListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import type { AdminListParams } from '@/features/admin/lib/list-params';

const columns: ColumnDef<AdminPlayerListRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Név',
    meta: { sortKey: 'name' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'country',
    header: 'Ország',
    cell: ({ row }) => row.original.country ?? '—',
  },
  {
    id: 'linked',
    header: 'Fiók',
    cell: ({ row }) =>
      row.original.hasUser ? (
        <Badge variant="secondary">Van user</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  },
  {
    accessorKey: 'mmr',
    header: 'MMR',
    meta: { sortKey: 'mmr' },
  },
  {
    accessorKey: 'oacMmr',
    header: 'OAC MMR',
    meta: { sortKey: 'oac' },
  },
  {
    accessorKey: 'tournamentsPlayed',
    header: 'Versenyek',
    meta: { sortKey: 'tp' },
  },
];

type Props = {
  rows: AdminPlayerListRow[];
  total: number;
  params: AdminListParams;
};

export function PlayersDirectoryTable({ rows, total, params }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/players"
      emptyLabel="Nincs játékos."
      onRowHref={(row) => `/admin/players/${row._id}`}
    />
  );
}
