import React from 'react';
import { notFound } from 'next/navigation';
import { AdminTournamentsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminTournamentAdminPanel } from '@/features/admin/tournaments/AdminTournamentAdminPanel';

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ)) notFound();

  const { locale, id } = await params;
  const tournament = await AdminTournamentsQueryService.findOneForAdmin(id);
  if (!tournament) notFound();

  const settings = tournament.tournamentSettings as { name?: string } | undefined;
  const title = String(settings?.name ?? tournament.tournamentId);
  const canWrite = staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_WRITE);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={`${String(tournament.tournamentId)} · ${String(tournament._id)}`}
        backHref="/admin/tournaments"
        backLabel="Tournaments"
      />

      {canWrite ? (
        <AdminTournamentAdminPanel
          locale={locale}
          mongoId={String(tournament._id)}
          flags={{
            isArchived: Boolean(tournament.isArchived),
            isSandbox: Boolean(tournament.isSandbox),
            isDeleted: Boolean(tournament.isDeleted),
            verified: Boolean(tournament.verified),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Read-only — missing tournaments write capability.</p>
      )}

      <pre className="max-h-[55vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(tournament, null, 2)}
      </pre>
    </div>
  );
}
