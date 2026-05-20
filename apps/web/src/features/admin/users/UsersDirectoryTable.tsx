'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminUserListRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { getUserRoleBadgeVariant } from '@/features/admin/lib/status-badges';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminListParams } from '@/features/admin/lib/list-params';

const columns: ColumnDef<AdminUserListRow, unknown>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { sortKey: 'email' },
    cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
  },
  {
    accessorKey: 'username',
    header: 'Felhasználónév',
    meta: { sortKey: 'username' },
  },
  {
    accessorKey: 'name',
    header: 'Név',
    meta: { sortKey: 'name' },
  },
  {
    id: 'flags',
    header: 'Jogok',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.isAdmin ? (
          <Badge variant={getUserRoleBadgeVariant('admin')}>Admin</Badge>
        ) : null}
        {row.original.isVerified ? (
          <Badge variant={getUserRoleBadgeVariant('verified')}>Megerősítve</Badge>
        ) : null}
        {row.original.isDeleted ? (
          <Badge variant={getUserRoleBadgeVariant('deleted')}>Törölt</Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'lastLogin',
    header: 'Utolsó belépés',
    meta: { sortKey: 'lastLogin' },
    cell: ({ row }) => formatAdminDate(row.original.lastLogin),
  },
  {
    accessorKey: 'createdAt',
    header: 'Regisztráció',
    meta: { sortKey: 'createdAt' },
    cell: ({ row }) => formatAdminDate(row.original.createdAt),
  },
];

type Props = {
  rows: AdminUserListRow[];
  total: number;
  params: AdminListParams;
  onRowClick?: (row: AdminUserListRow) => void;
};

export function UsersDirectoryTable({ rows, total, params, onRowClick }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/users"
      emptyLabel="Nincs felhasználó."
      onRowHref={onRowClick ? undefined : (row) => `/admin/users/${row._id}`}
      onRowClick={onRowClick}
    />
  );
}
