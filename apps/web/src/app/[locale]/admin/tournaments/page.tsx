'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink } from '@tabler/icons-react';

interface Tournament {
  _id: string;
  name: string;
  club: string;
  date: string;
  status: 'upcoming' | 'live' | 'completed' | 'archived';
  participants: number;
  verified: boolean;
  isSandbox: boolean;
}

const mockTournaments: Tournament[] = [
  { _id: '1', name: 'Summer Championship 2024', club: 'Budapest Darts Club', date: '2024-07-15', status: 'upcoming', participants: 64, verified: true, isSandbox: false },
  { _id: '2', name: 'Weekly League Match', club: 'Debrecen Arrows', date: '2024-06-25', status: 'live', participants: 32, verified: true, isSandbox: false },
  { _id: '3', name: 'Test Tournament', club: 'Szeged Darts', date: '2024-06-20', status: 'completed', participants: 16, verified: false, isSandbox: true },
  { _id: '4', name: 'Spring Open 2024', club: 'Budapest Darts Club', date: '2024-03-10', status: 'archived', participants: 48, verified: true, isSandbox: false },
];

const statusColors: Record<Tournament['status'], string> = {
  upcoming: 'bg-admin-info/15 text-admin-info',
  live: 'bg-admin-success/15 text-admin-success',
  completed: 'bg-admin-surface-elevated text-admin-on-surface-variant',
  archived: 'bg-admin-outline-variant/20 text-admin-on-surface-variant',
};

const columns: ColumnDef<Tournament>[] = [
  {
    accessorKey: 'name',
    header: 'Tournament',
    cell: ({ row }) => (
      <div>
        <span className="font-medium text-admin-on-surface">{row.original.name}</span>
        {row.original.isSandbox && (
          <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-admin-warning/15 text-admin-warning">
            Sandbox
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'club',
    header: 'Club',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.club}</span>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant text-xs admin-text-mono-data">
        {row.original.date}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[row.original.status]}`}>
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'participants',
    header: 'Players',
    cell: ({ row }) => (
      <span className="text-admin-on-surface">{row.original.participants}</span>
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
        {row.original.verified ? 'Yes' : 'No'}
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

export default function AdminTournamentsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (tournament: Tournament) => {
    router.push(`/${locale}/admin/tournaments/${tournament._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tournaments"
        description="Manage tournaments, flags, and passwords"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {mockTournaments.length === 0 ? (
        <AdminEmptyState
          icon="emoji_events"
          title="No tournaments found"
          description="Tournaments will appear here once they are created."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockTournaments}
          searchKey="name"
          searchPlaceholder="Search tournaments..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
