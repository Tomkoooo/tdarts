'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminMatchListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { getMatchStatusBadgeVariant } from '@/features/admin/lib/status-badges';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminMatchesListParams } from '@/features/admin/matches/actions';

const columns: ColumnDef<AdminMatchListRow, unknown>[] = [
  {
    id: 'players',
    header: 'Játékosok',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.player1Name} <span className="text-muted-foreground">vs</span>{' '}
        {row.original.player2Name}
      </span>
    ),
  },
  {
    accessorKey: 'tournamentCode',
    header: 'Verseny',
    meta: { sortKey: 'tournament' },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">{row.original.tournamentName || row.original.tournamentCode}</span>
        <span className="text-muted-foreground font-mono text-xs">{row.original.tournamentCode}</span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Státusz',
    meta: { sortKey: 'status' },
    cell: ({ row }) => (
      <Badge variant={getMatchStatusBadgeVariant(row.original.status)}>{row.original.status}</Badge>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Típus',
    meta: { sortKey: 'type' },
  },
  {
    accessorKey: 'round',
    header: 'Kör',
    meta: { sortKey: 'round' },
  },
  {
    id: 'override',
    header: 'Manuális',
    cell: ({ row }) =>
      row.original.manualOverride ? (
        <Badge variant="warning">Override</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
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
  rows: AdminMatchListRow[];
  total: number;
  params: AdminMatchesListParams;
  extraQuery?: Record<string, string | undefined>;
};

export function MatchesDirectoryTable({ rows, total, params, extraQuery }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/matches"
      emptyLabel="Nincs meccs."
      extraQuery={extraQuery}
      onRowHref={(row) => `/admin/matches/${row._id}`}
    />
  );
}
