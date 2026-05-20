'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink } from '@tabler/icons-react';

// Mock data - will be replaced with real data fetching
interface User {
  _id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: string;
}

const mockUsers: User[] = [
  { _id: '1', email: 'admin@tdarts.hu', username: 'admin', isAdmin: true, isVerified: true, isDeleted: false, createdAt: '2024-01-15' },
  { _id: '2', email: 'user@example.com', username: 'player1', isAdmin: false, isVerified: true, isDeleted: false, createdAt: '2024-02-20' },
  { _id: '3', email: 'test@test.com', username: 'tester', isAdmin: false, isVerified: false, isDeleted: false, createdAt: '2024-03-10' },
  { _id: '4', email: 'deleted@user.com', username: 'old_user', isAdmin: false, isVerified: true, isDeleted: true, createdAt: '2023-12-01' },
];

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'username',
    header: 'Username',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.username}</span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.email}</span>
    ),
  },
  {
    accessorKey: 'isAdmin',
    header: 'Role',
    cell: ({ row }) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          row.original.isAdmin
            ? 'bg-admin-primary/15 text-admin-primary'
            : 'bg-admin-surface-elevated text-admin-on-surface-variant'
        }`}
      >
        {row.original.isAdmin ? 'Admin' : 'User'}
      </span>
    ),
  },
  {
    accessorKey: 'isVerified',
    header: 'Status',
    cell: ({ row }) => {
      if (row.original.isDeleted) {
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-admin-error/15 text-admin-error">
            Deleted
          </span>
        );
      }
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            row.original.isVerified
              ? 'bg-admin-success/15 text-admin-success'
              : 'bg-admin-warning/15 text-admin-warning'
          }`}
        >
          {row.original.isVerified ? 'Verified' : 'Unverified'}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant text-xs admin-text-mono-data">
        {row.original.createdAt}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" className="text-admin-on-surface-variant hover:text-admin-on-surface">
        <IconExternalLink className="w-4 h-4" />
      </Button>
    ),
  },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (user: User) => {
    router.push(`/${locale}/admin/users/${user._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Manage user accounts, roles, and permissions"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {mockUsers.length === 0 ? (
        <AdminEmptyState
          icon="group"
          title="No users found"
          description="Users will appear here once they register on the platform."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockUsers}
          searchKey="email"
          searchPlaceholder="Search by email..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
