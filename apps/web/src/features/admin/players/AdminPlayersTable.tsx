'use client';

import React, { useMemo } from 'react';
import { Link } from '@/i18n/routing';
import type { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/features/admin/tables/AdminDataTable';
import type { AdminPlayerListRow } from '@tdarts/services';

type Props = {
  rows: AdminPlayerListRow[];
};

export function AdminPlayersTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<AdminPlayerListRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Player',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/players/${row.original._id}`}>
            {row.original.name}
          </Link>
        ),
      },
      { id: 'country', header: 'Country', accessorFn: (r) => r.country || '—' },
      {
        id: 'user',
        header: 'Linked user',
        accessorFn: (r) => (r.hasUser ? 'yes' : 'no'),
      },
      { id: 'mmr', header: 'MMR', accessorKey: 'mmr' },
      { id: 'oac', header: 'OAC MMR', accessorKey: 'oacMmr' },
      { id: 'tp', header: 'Tournaments', accessorKey: 'tournamentsPlayed' },
    ],
    [],
  );

  return <AdminDataTable tableId="players" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
