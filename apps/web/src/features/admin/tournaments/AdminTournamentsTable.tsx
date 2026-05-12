'use client';

import React, { useMemo } from 'react';
import { Link } from '@/i18n/routing';
import type { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/features/admin/tables/AdminDataTable';
import type { AdminTournamentListRow } from '@tdarts/services';

type Props = {
  rows: AdminTournamentListRow[];
};

export function AdminTournamentsTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<AdminTournamentListRow>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <Link className="font-mono text-primary hover:underline" href={`/admin/tournaments/${row.original._id}`}>
            {row.original.tournamentId}
          </Link>
        ),
      },
      { id: 'name', header: 'Name', accessorKey: 'name' },
      { id: 'club', header: 'Club', accessorKey: 'clubName' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
      {
        id: 'start',
        header: 'Start',
        accessorFn: (r) => (r.startDate ? new Date(r.startDate).toLocaleString() : '—'),
      },
      { id: 'format', header: 'Format', accessorKey: 'format' },
      { id: 'players', header: 'Players', accessorKey: 'playersCount' },
      { id: 'boards', header: 'Boards', accessorKey: 'boardsCount' },
      {
        id: 'fee',
        header: 'Entry',
        accessorFn: (r) => `${r.entryFee} ${r.entryFeeCurrency}`,
      },
    ],
    [],
  );

  return <AdminDataTable tableId="tournaments" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
