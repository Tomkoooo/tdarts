'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@/i18n/routing';
import { AdminDataGrid } from '@/features/admin/tables/AdminDataGrid';
import type { AdminFeedbackListRow } from '@tdarts/services';

export function AdminFeedbackTable({ rows }: { rows: AdminFeedbackListRow[] }) {
  const columns = useMemo<ColumnDef<AdminFeedbackListRow>[]>(
    () => [
      {
        id: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/support/feedback/${row.original._id}`}>
            {row.original.title}
          </Link>
        ),
      },
      { id: 'category', header: 'Category', accessorKey: 'category' },
      { id: 'status', header: 'Status', accessorKey: 'status' },
      { id: 'priority', header: 'Priority', accessorKey: 'priority' },
      { id: 'email', header: 'Email', accessorKey: 'email' },
      {
        id: 'read',
        header: 'Read',
        cell: ({ row }) => (row.original.isReadByAdmin ? 'yes' : <span className="text-amber-500">no</span>),
      },
      { id: 'requestId', header: 'requestId', accessorFn: (r) => r.requestId || '—' },
      { id: 'created', header: 'Created', accessorKey: 'createdAt' },
    ],
    [],
  );

  return <AdminDataGrid tableId="feedback" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
