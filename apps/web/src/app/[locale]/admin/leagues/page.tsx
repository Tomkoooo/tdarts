'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink } from '@tabler/icons-react';

interface League {
  _id: string;
  name: string;
  season: string;
  teams: number;
  status: 'active' | 'completed' | 'upcoming';
  startDate: string;
  endDate: string;
}

const mockLeagues: League[] = [
  { _id: '1', name: 'Hungarian Premier League', season: '2024', teams: 12, status: 'active', startDate: '2024-01-15', endDate: '2024-12-15' },
  { _id: '2', name: 'Budapest City League', season: '2024', teams: 8, status: 'active', startDate: '2024-02-01', endDate: '2024-11-30' },
  { _id: '3', name: 'Winter Cup Series', season: '2024', teams: 16, status: 'upcoming', startDate: '2024-12-01', endDate: '2025-02-28' },
  { _id: '4', name: 'Summer League 2023', season: '2023', teams: 10, status: 'completed', startDate: '2023-06-01', endDate: '2023-08-31' },
];

const statusColors: Record<League['status'], string> = {
  active: 'bg-admin-success/15 text-admin-success',
  upcoming: 'bg-admin-info/15 text-admin-info',
  completed: 'bg-admin-surface-elevated text-admin-on-surface-variant',
};

const columns: ColumnDef<League>[] = [
  {
    accessorKey: 'name',
    header: 'League',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'season',
    header: 'Season',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.season}</span>
    ),
  },
  {
    accessorKey: 'teams',
    header: 'Teams',
    cell: ({ row }) => (
      <span className="text-admin-on-surface">{row.original.teams}</span>
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
    accessorKey: 'startDate',
    header: 'Start',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant text-xs admin-text-mono-data">
        {row.original.startDate}
      </span>
    ),
  },
  {
    accessorKey: 'endDate',
    header: 'End',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant text-xs admin-text-mono-data">
        {row.original.endDate}
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

export default function AdminLeaguesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (league: League) => {
    router.push(`/${locale}/admin/leagues/${league._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leagues"
        description="Manage league competitions and seasons"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {mockLeagues.length === 0 ? (
        <AdminEmptyState
          icon="leaderboard"
          title="No leagues found"
          description="Leagues will appear here once they are created."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockLeagues}
          searchKey="name"
          searchPlaceholder="Search leagues..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
