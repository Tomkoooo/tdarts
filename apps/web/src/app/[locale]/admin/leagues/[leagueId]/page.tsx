'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';

const mockLeague = {
  _id: '1',
  name: 'Hungarian Premier League',
  season: '2024',
  teams: 12,
  status: 'active',
  startDate: '2024-01-15',
  endDate: '2024-12-15',
  description: 'The premier darts league competition in Hungary.',
  matchesPlayed: 48,
  matchesRemaining: 18,
};

export default function AdminLeagueDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const leagueId = params.leagueId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/leagues`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockLeague.name}
          description={`Season ${mockLeague.season}`}
          actions={
            <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
              <IconEdit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              League Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">League ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{leagueId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Name</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockLeague.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Season</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockLeague.season}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Teams</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockLeague.teams}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Start Date</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockLeague.startDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">End Date</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockLeague.endDate}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-admin-on-surface-variant">Description</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockLeague.description}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Standings
            </h3>
            <p className="text-sm text-admin-on-surface-variant">
              League standings will appear here when connected to backend services.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Status
            </h3>
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-admin-success/15 text-admin-success capitalize">
              {mockLeague.status}
            </span>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Matches Played</span>
                <span className="text-sm text-admin-on-surface font-medium">{mockLeague.matchesPlayed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Matches Remaining</span>
                <span className="text-sm text-admin-on-surface font-medium">{mockLeague.matchesRemaining}</span>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-admin-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-admin-primary rounded-full transition-all"
                    style={{ width: `${(mockLeague.matchesPlayed / (mockLeague.matchesPlayed + mockLeague.matchesRemaining)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
