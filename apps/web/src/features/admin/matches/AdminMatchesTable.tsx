'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@/i18n/routing';
import { AdminDataGrid } from '@/features/admin/tables/AdminDataGrid';
import type { AdminMatchListRow } from '@tdarts/services';

export function AdminMatchesTable({ rows }: { rows: AdminMatchListRow[] }) {
  const columns = useMemo<ColumnDef<AdminMatchListRow>[]>(
    () => [
      {
        id: 'id',
        header: 'Match',
        cell: ({ row }) => (
          <Link className="font-mono text-xs text-primary hover:underline" href={`/admin/matches/${row.original._id}`}>
            {row.original._id.slice(-8)}
          </Link>
        ),
      },
      { id: 'tournament', header: 'Tournament', accessorFn: (r) => r.tournamentCode || r.tournamentRef },
      { id: 'type', header: 'Type', accessorKey: 'type' },
      { id: 'round', header: 'Round', accessorKey: 'round' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
      {
        id: 'manual',
        header: 'Manual',
        cell: ({ row }) => (row.original.manualOverride ? <span className="text-amber-500">yes</span> : '—'),
      },
      { id: 'updated', header: 'Updated', accessorKey: 'updatedAt' },
    ],
    [],
  );

  return <AdminDataGrid tableId="matches" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
