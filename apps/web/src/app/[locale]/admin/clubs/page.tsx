'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink } from '@tabler/icons-react';

interface Club {
  _id: string;
  name: string;
  address: string;
  verified: boolean;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

const mockClubs: Club[] = [
  { _id: '1', name: 'Budapest Darts Club', address: 'Budapest, Hungary', verified: true, isActive: true, memberCount: 45, createdAt: '2024-01-10' },
  { _id: '2', name: 'Debrecen Arrows', address: 'Debrecen, Hungary', verified: true, isActive: true, memberCount: 32, createdAt: '2024-02-15' },
  { _id: '3', name: 'Szeged Darts', address: 'Szeged, Hungary', verified: false, isActive: true, memberCount: 18, createdAt: '2024-03-20' },
  { _id: '4', name: 'Inactive Club', address: 'Pecs, Hungary', verified: true, isActive: false, memberCount: 5, createdAt: '2023-11-05' },
];

const columns: ColumnDef<Club>[] = [
  {
    accessorKey: 'name',
    header: 'Club Name',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'address',
    header: 'Location',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.address}</span>
    ),
  },
  {
    accessorKey: 'memberCount',
    header: 'Members',
    cell: ({ row }) => (
      <span className="text-admin-on-surface">{row.original.memberCount}</span>
    ),
  },
  {
    accessorKey: 'verified',
    header: 'Verified',
    cell: ({ row }) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          row.original.verified
            ? 'bg-admin-success/15 text-admin-success'
            : 'bg-admin-warning/15 text-admin-warning'
        }`}
      >
        {row.original.verified ? 'Verified' : 'Pending'}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          row.original.isActive
            ? 'bg-admin-primary/15 text-admin-primary'
            : 'bg-admin-surface-elevated text-admin-on-surface-variant'
        }`}
      >
        {row.original.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant text-xs admin-text-mono-data">
        {row.original.createdAt}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <Button variant="ghost" size="sm" className="text-admin-on-surface-variant hover:text-admin-on-surface">
        <IconExternalLink className="w-4 h-4" />
      </Button>
    ),
  },
];

export default function AdminClubsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (club: Club) => {
    router.push(`/${locale}/admin/clubs/${club._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Clubs"
        description="Manage darts clubs and their settings"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {mockClubs.length === 0 ? (
        <AdminEmptyState
          icon="store"
          title="No clubs found"
          description="Clubs will appear here once they are registered on the platform."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockClubs}
          searchKey="name"
          searchPlaceholder="Search clubs..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
