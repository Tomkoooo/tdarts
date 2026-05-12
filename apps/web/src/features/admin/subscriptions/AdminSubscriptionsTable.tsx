'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@/i18n/routing';
import { AdminDataGrid } from '@/features/admin/tables/AdminDataGrid';
import type { AdminSubscriptionRow } from '@tdarts/services';

export function AdminSubscriptionsTable({ rows }: { rows: AdminSubscriptionRow[] }) {
  const columns = useMemo<ColumnDef<AdminSubscriptionRow>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/users/${row.original.userId}`}>
            {row.original.userEmail}
          </Link>
        ),
      },
      {
        id: 'club',
        header: 'Club',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/clubs/${row.original.clubId}`}>
            {row.original.clubName}
          </Link>
        ),
      },
      { id: 'created', header: 'Since', accessorKey: 'createdAt' },
    ],
    [],
  );

  return <AdminDataGrid tableId="subscriptions" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
