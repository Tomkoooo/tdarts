import React from 'react';
import { notFound } from 'next/navigation';
import { AdminMatchesQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { MatchRevertButton } from '@/features/admin/matches/MatchRevertButton';

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_MATCHES_READ)) notFound();

  const { id } = await params;
  const match = await AdminMatchesQueryService.getById(id);
  if (!match) notFound();

  const canRevert = staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_WRITE);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Match ${id.slice(-8)}`} description={String(match.type)} backHref="/admin/matches" backLabel="Matches" />

      {canRevert && match.manualOverride ? (
        <div className="flex items-center gap-3">
          <MatchRevertButton matchId={id} />
          <span className="text-xs text-muted-foreground">Requires tournaments write (match integrity).</span>
        </div>
      ) : null}

      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(match, null, 2)}
      </pre>
    </div>
  );
}
