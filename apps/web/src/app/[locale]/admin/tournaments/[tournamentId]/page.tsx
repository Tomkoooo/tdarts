'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconEdit, IconKey, IconArchive } from '@tabler/icons-react';

const mockTournament = {
  _id: '1',
  name: 'Summer Championship 2024',
  club: { name: 'Budapest Darts Club', _id: 'club1' },
  date: '2024-07-15T10:00:00Z',
  status: 'upcoming',
  participants: 64,
  verified: true,
  isSandbox: false,
  isArchived: false,
  isDeleted: false,
  humanPassword: '****',
  createdAt: '2024-06-01T10:00:00Z',
  format: 'Single Elimination',
  entryFee: 5000,
};

export default function AdminTournamentDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const tournamentId = params.tournamentId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/tournaments`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockTournament.name}
          description={`${mockTournament.club.name} - ${new Date(mockTournament.date).toLocaleDateString()}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconKey className="w-4 h-4 mr-2" />
                Rotate Password
              </Button>
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconEdit className="w-4 h-4 mr-2" />
                Edit Flags
              </Button>
              <Button variant="outline" size="sm" className="border-admin-warning/50 text-admin-warning hover:bg-admin-warning/10">
                <IconArchive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Tournament Details
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Tournament ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{tournamentId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Name</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockTournament.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Club</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">
                  <Link href={`/${locale}/admin/clubs/${mockTournament.club._id}`} className="text-admin-primary hover:underline">
                    {mockTournament.club.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Date</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockTournament.date).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Format</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockTournament.format}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Entry Fee</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockTournament.entryFee} HUF</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Participants</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockTournament.participants}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Created</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockTournament.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Human Password
            </h3>
            <div className="flex items-center gap-4">
              <code className="px-3 py-2 bg-admin-surface-elevated rounded-md text-admin-on-surface admin-text-mono-data">
                {mockTournament.humanPassword}
              </code>
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconKey className="w-4 h-4 mr-2" />
                Rotate
              </Button>
            </div>
            <p className="mt-2 text-xs text-admin-on-surface-variant">
              This password is used by players to join the tournament.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Flags
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Verified</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockTournament.verified ? 'bg-admin-success/15 text-admin-success' : 'bg-admin-warning/15 text-admin-warning'
                }`}>
                  {mockTournament.verified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Sandbox</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockTournament.isSandbox ? 'bg-admin-warning/15 text-admin-warning' : 'bg-admin-surface-elevated text-admin-on-surface-variant'
                }`}>
                  {mockTournament.isSandbox ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Archived</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockTournament.isArchived ? 'bg-admin-outline-variant/20 text-admin-on-surface-variant' : 'bg-admin-surface-elevated text-admin-on-surface-variant'
                }`}>
                  {mockTournament.isArchived ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Deleted</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockTournament.isDeleted ? 'bg-admin-error/15 text-admin-error' : 'bg-admin-surface-elevated text-admin-on-surface-variant'
                }`}>
                  {mockTournament.isDeleted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Status
            </h3>
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-admin-info/15 text-admin-info capitalize">
              {mockTournament.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
