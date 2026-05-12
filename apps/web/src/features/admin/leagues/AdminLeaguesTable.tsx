'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@/i18n/routing';
import { AdminDataGrid } from '@/features/admin/tables/AdminDataGrid';
import type { AdminLeagueListRow } from '@tdarts/services';

export function AdminLeaguesTable({ rows }: { rows: AdminLeagueListRow[] }) {
  const columns = useMemo<ColumnDef<AdminLeagueListRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/leagues/${row.original._id}`}>
            {row.original.name}
          </Link>
        ),
      },
      { id: 'club', header: 'Club', accessorKey: 'clubName' },
      { id: 'players', header: 'Players', accessorKey: 'playersCount' },
      { id: 'tournaments', header: 'Tournaments', accessorKey: 'tournamentsAttached' },
      {
        id: 'flags',
        header: 'Flags',
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.verified ? <span className="mr-1 text-emerald-500">verified</span> : null}
            {row.original.isActive ? <span className="text-muted-foreground">active</span> : <span>inactive</span>}
          </span>
        ),
      },
      { id: 'updated', header: 'Updated', accessorKey: 'updatedAt' },
    ],
    [],
  );

  return <AdminDataGrid tableId="leagues" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
