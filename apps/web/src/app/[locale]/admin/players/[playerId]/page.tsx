'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';

const mockPlayer = {
  _id: '1',
  name: 'John Smith',
  country: 'Hungary',
  club: { name: 'Budapest Darts Club', _id: 'club1' },
  oacMmr: 1850,
  matchesPlayed: 127,
  wins: 78,
  losses: 49,
  avgScore: 68.5,
  highestCheckout: 170,
  createdAt: '2024-01-05T10:00:00Z',
  updatedAt: '2024-06-20T14:00:00Z',
};

export default function AdminPlayerDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const playerId = params.playerId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/players`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockPlayer.name}
          description={`${mockPlayer.country || 'Unknown country'} - ${mockPlayer.club?.name || 'No club'}`}
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
              Player Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Player ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{playerId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Name</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockPlayer.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Country</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockPlayer.country || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Club</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">
                  {mockPlayer.club ? (
                    <Link href={`/${locale}/admin/clubs/${mockPlayer.club._id}`} className="text-admin-primary hover:underline">
                      {mockPlayer.club.name}
                    </Link>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Created</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockPlayer.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Last Updated</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockPlayer.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Match History
            </h3>
            <p className="text-sm text-admin-on-surface-variant">
              Match history will appear here when connected to backend services.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Statistics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface-variant">OAC MMR</span>
                  <span className="admin-text-stats-lg text-admin-primary">{mockPlayer.oacMmr}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-admin-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface">Matches Played</span>
                  <span className="text-sm text-admin-on-surface font-medium">{mockPlayer.matchesPlayed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface">Wins</span>
                  <span className="text-sm text-admin-success font-medium">{mockPlayer.wins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface">Losses</span>
                  <span className="text-sm text-admin-error font-medium">{mockPlayer.losses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface">Win Rate</span>
                  <span className="text-sm text-admin-on-surface font-medium">
                    {((mockPlayer.wins / mockPlayer.matchesPlayed) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-admin-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface">Avg Score</span>
                  <span className="text-sm text-admin-on-surface font-medium">{mockPlayer.avgScore}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-admin-on-surface">Highest Checkout</span>
                  <span className="text-sm text-admin-on-surface font-medium">{mockPlayer.highestCheckout}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
