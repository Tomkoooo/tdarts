'use client';

import React, { useMemo } from 'react';
import { Link } from '@/i18n/routing';
import type { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/features/admin/tables/AdminDataTable';
import type { AdminClubListRow } from '@tdarts/services';

type Props = {
  rows: AdminClubListRow[];
};

export function AdminClubsTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<AdminClubListRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Club',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/clubs/${row.original._id}`}>
            {row.original.name}
          </Link>
        ),
      },
      { id: 'country', header: 'Country', accessorKey: 'country' },
      { id: 'city', header: 'City', accessorFn: (r) => r.city || '—' },
      { id: 'tier', header: 'Tier', accessorKey: 'subscriptionModel' },
      {
        id: 'flags',
        header: 'Flags',
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.verified ? <span className="rounded bg-emerald-500/20 px-1">verified</span> : null}
            {!row.original.isActive ? <span className="ml-1 rounded bg-destructive/20 px-1">inactive</span> : null}
          </span>
        ),
      },
      { id: 'members', header: 'Members', accessorKey: 'membersCount' },
      {
        id: 'updated',
        header: 'Updated',
        accessorFn: (r) => new Date(r.updatedAt).toLocaleDateString(),
      },
    ],
    [],
  );

  return <AdminDataTable tableId="clubs" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
