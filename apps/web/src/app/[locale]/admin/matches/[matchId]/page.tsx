'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';

const mockMatch = {
  _id: '1',
  tournament: { name: 'Summer Championship', _id: 't1' },
  player1: { name: 'John Smith', _id: 'p1' },
  player2: { name: 'Peter Nagy', _id: 'p2' },
  score: '3-1',
  winner: 'John Smith',
  date: '2024-06-25T14:30:00Z',
  status: 'completed',
  legs: [
    { player1Score: 501, player2Score: 0, winner: 'player1' },
    { player1Score: 501, player2Score: 0, winner: 'player1' },
    { player1Score: 0, player2Score: 501, winner: 'player2' },
    { player1Score: 501, player2Score: 0, winner: 'player1' },
  ],
};

export default function AdminMatchDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const matchId = params.matchId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/matches`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={`${mockMatch.player1.name} vs ${mockMatch.player2.name}`}
          description={`${mockMatch.tournament.name} - ${new Date(mockMatch.date).toLocaleDateString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Match Details
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Match ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{matchId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Tournament</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">
                  <Link href={`/${locale}/admin/tournaments/${mockMatch.tournament._id}`} className="text-admin-primary hover:underline">
                    {mockMatch.tournament.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Date</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockMatch.date).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Status</dt>
                <dd className="mt-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-admin-success/15 text-admin-success capitalize">
                    {mockMatch.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Leg by Leg
            </h3>
            <div className="space-y-2">
              {mockMatch.legs.map((leg, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-admin-outline-variant/10 last:border-0">
                  <span className="text-sm text-admin-on-surface-variant">Leg {index + 1}</span>
                  <div className="flex items-center gap-4">
                    <span className={leg.winner === 'player1' ? 'text-admin-success font-medium' : 'text-admin-on-surface-variant'}>
                      {leg.player1Score}
                    </span>
                    <span className="text-admin-on-surface-variant">-</span>
                    <span className={leg.winner === 'player2' ? 'text-admin-success font-medium' : 'text-admin-on-surface-variant'}>
                      {leg.player2Score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Final Score
            </h3>
            <div className="text-center">
              <div className="admin-text-stats-lg text-admin-primary mb-2">{mockMatch.score}</div>
              <p className="text-sm text-admin-success">Winner: {mockMatch.winner}</p>
            </div>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Players
            </h3>
            <div className="space-y-3">
              <Link
                href={`/${locale}/admin/players/${mockMatch.player1._id}`}
                className="block p-3 rounded-lg bg-admin-surface-elevated hover:bg-admin-surface-container-high transition-colors"
              >
                <span className={`text-sm ${mockMatch.winner === mockMatch.player1.name ? 'text-admin-success font-medium' : 'text-admin-on-surface'}`}>
                  {mockMatch.player1.name}
                </span>
              </Link>
              <Link
                href={`/${locale}/admin/players/${mockMatch.player2._id}`}
                className="block p-3 rounded-lg bg-admin-surface-elevated hover:bg-admin-surface-container-high transition-colors"
              >
                <span className={`text-sm ${mockMatch.winner === mockMatch.player2.name ? 'text-admin-success font-medium' : 'text-admin-on-surface'}`}>
                  {mockMatch.player2.name}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
