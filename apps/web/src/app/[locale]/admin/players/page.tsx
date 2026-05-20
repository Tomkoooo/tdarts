'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink } from '@tabler/icons-react';

interface Player {
  _id: string;
  name: string;
  country: string | null;
  club: string | null;
  oacMmr: number;
  matchesPlayed: number;
  createdAt: string;
}

const mockPlayers: Player[] = [
  { _id: '1', name: 'John Smith', country: 'Hungary', club: 'Budapest Darts Club', oacMmr: 1850, matchesPlayed: 127, createdAt: '2024-01-05' },
  { _id: '2', name: 'Peter Nagy', country: 'Hungary', club: 'Debrecen Arrows', oacMmr: 1720, matchesPlayed: 89, createdAt: '2024-02-10' },
  { _id: '3', name: 'Michael Brown', country: 'UK', club: null, oacMmr: 1680, matchesPlayed: 45, createdAt: '2024-03-15' },
  { _id: '4', name: 'Unknown Player', country: null, club: null, oacMmr: 1500, matchesPlayed: 12, createdAt: '2024-04-01' },
];

const columns: ColumnDef<Player>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'country',
    header: 'Country',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.country || '-'}</span>
    ),
  },
  {
    accessorKey: 'club',
    header: 'Club',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.club || '-'}</span>
    ),
  },
  {
    accessorKey: 'oacMmr',
    header: 'OAC MMR',
    cell: ({ row }) => (
      <span className="text-admin-on-surface admin-text-mono-data">{row.original.oacMmr}</span>
    ),
  },
  {
    accessorKey: 'matchesPlayed',
    header: 'Matches',
    cell: ({ row }) => (
      <span className="text-admin-on-surface">{row.original.matchesPlayed}</span>
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

export default function AdminPlayersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (player: Player) => {
    router.push(`/${locale}/admin/players/${player._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Players"
        description="Manage player profiles and statistics"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {mockPlayers.length === 0 ? (
        <AdminEmptyState
          icon="person"
          title="No players found"
          description="Players will appear here once they participate in tournaments."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockPlayers}
          searchKey="name"
          searchPlaceholder="Search players..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
