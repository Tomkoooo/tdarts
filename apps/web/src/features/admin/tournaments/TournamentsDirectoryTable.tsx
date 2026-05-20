'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminTournamentListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { getTournamentStatusBadgeVariant } from '@/features/admin/lib/status-badges';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminTournamentsListParams } from '@/features/admin/tournaments/actions';

const columns: ColumnDef<AdminTournamentListRow, unknown>[] = [
  {
    accessorKey: 'tournamentId',
    header: 'Kód',
    meta: { sortKey: 'code' },
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.tournamentId}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Név',
    meta: { sortKey: 'name' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Státusz',
    meta: { sortKey: 'status' },
    cell: ({ row }) => (
      <Badge variant={getTournamentStatusBadgeVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
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
    accessorKey: 'startDate',
    header: 'Kezdés',
    cell: ({ row }) => formatAdminDate(row.original.startDate),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Frissítve',
    meta: { sortKey: 'updated' },
    cell: ({ row }) => formatAdminDate(row.original.updatedAt),
  },
];

type Props = {
  rows: AdminTournamentListRow[];
  total: number;
  params: AdminTournamentsListParams;
  extraQuery?: Record<string, string | undefined>;
};

export function TournamentsDirectoryTable({ rows, total, params, extraQuery }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/tournaments"
      emptyLabel="Nincs verseny."
      extraQuery={extraQuery}
      onRowHref={(row) => `/admin/tournaments/${row._id}`}
    />
  );
}
