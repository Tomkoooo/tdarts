'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink } from '@tabler/icons-react';

interface Match {
  _id: string;
  tournament: string;
  player1: string;
  player2: string;
  score: string;
  winner: string;
  date: string;
  status: 'completed' | 'in_progress' | 'scheduled';
}

const mockMatches: Match[] = [
  { _id: '1', tournament: 'Summer Championship', player1: 'John Smith', player2: 'Peter Nagy', score: '3-1', winner: 'John Smith', date: '2024-06-25', status: 'completed' },
  { _id: '2', tournament: 'Weekly League', player1: 'Michael Brown', player2: 'David Wilson', score: '2-2', winner: '-', date: '2024-06-25', status: 'in_progress' },
  { _id: '3', tournament: 'Summer Championship', player1: 'Anna Taylor', player2: 'Sarah Jones', score: '-', winner: '-', date: '2024-06-26', status: 'scheduled' },
];

const statusColors: Record<Match['status'], string> = {
  completed: 'bg-admin-success/15 text-admin-success',
  in_progress: 'bg-admin-warning/15 text-admin-warning',
  scheduled: 'bg-admin-info/15 text-admin-info',
};

const columns: ColumnDef<Match>[] = [
  {
    accessorKey: 'tournament',
    header: 'Tournament',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.tournament}</span>
    ),
  },
  {
    accessorKey: 'player1',
    header: 'Player 1',
    cell: ({ row }) => (
      <span className={row.original.winner === row.original.player1 ? 'text-admin-success font-medium' : 'text-admin-on-surface-variant'}>
        {row.original.player1}
      </span>
    ),
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }) => (
      <span className="text-admin-on-surface admin-text-mono-data">{row.original.score}</span>
    ),
  },
  {
    accessorKey: 'player2',
    header: 'Player 2',
    cell: ({ row }) => (
      <span className={row.original.winner === row.original.player2 ? 'text-admin-success font-medium' : 'text-admin-on-surface-variant'}>
        {row.original.player2}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[row.original.status]}`}>
        {row.original.status.replace('_', ' ')}
      </span>
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
    id: 'actions',
    header: '',
    cell: () => (
      <Button variant="ghost" size="sm" className="text-admin-on-surface-variant hover:text-admin-on-surface">
        <IconExternalLink className="w-4 h-4" />
      </Button>
    ),
  },
];

export default function AdminMatchesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (match: Match) => {
    router.push(`/${locale}/admin/matches/${match._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Matches"
        description="View and manage match results"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {mockMatches.length === 0 ? (
        <AdminEmptyState
          icon="sports_score"
          title="No matches found"
          description="Matches will appear here once tournaments begin."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockMatches}
          searchKey="tournament"
          searchPlaceholder="Search by tournament..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
