'use client';

import React, { useMemo } from 'react';
import { Link } from '@/i18n/routing';
import type { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/features/admin/tables/AdminDataTable';
import type { AdminUserListRow } from '@tdarts/services';

type Props = {
  rows: AdminUserListRow[];
};

export function AdminUsersTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<AdminUserListRow>[]>(
    () => [
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/users/${row.original._id}`}>
            {row.original.email}
          </Link>
        ),
      },
      { id: 'username', header: 'Username', accessorKey: 'username' },
      { id: 'name', header: 'Name', accessorKey: 'name' },
      {
        id: 'flags',
        header: 'Flags',
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.isAdmin ? <span className="mr-1 rounded bg-amber-500/20 px-1">admin</span> : null}
            {row.original.isVerified ? <span className="rounded bg-emerald-500/20 px-1">verified</span> : null}
            {row.original.isDeleted ? <span className="ml-1 rounded bg-destructive/20 px-1">deleted</span> : null}
          </span>
        ),
      },
      {
        id: 'roles',
        header: 'adminRoles',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.adminRoles.join(', ') || '—'}</span>,
      },
      { id: 'auth', header: 'Auth', accessorKey: 'authProvider' },
      {
        id: 'lastLogin',
        header: 'Last login',
        accessorFn: (r) => r.lastLogin || '',
      },
    ],
    [],
  );

  return <AdminDataTable tableId="users" columns={columns} data={rows} getRowId={(r) => r._id} />;
}
