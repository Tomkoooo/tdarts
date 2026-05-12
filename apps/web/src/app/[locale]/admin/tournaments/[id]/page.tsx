import React from 'react';
import { notFound } from 'next/navigation';
import { AdminTournamentsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { Link } from '@/i18n/routing';

export default async function AdminTournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ)) notFound();

  const { id } = await params;
  const tournament = await AdminTournamentsQueryService.findOneForAdmin(id);
  if (!tournament) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/tournaments" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tournaments
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {String((tournament.tournamentSettings as { name?: string })?.name ?? tournament.tournamentId)}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          {String(tournament.tournamentId)} · {String(tournament._id)}
        </p>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(tournament, null, 2)}
      </pre>
    </div>
  );
}
