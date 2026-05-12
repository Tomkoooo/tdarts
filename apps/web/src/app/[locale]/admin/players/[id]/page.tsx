import React from 'react';
import { notFound } from 'next/navigation';
import { AdminPlayersQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminPlayerBasicsForm } from '@/features/admin/players/AdminPlayerBasicsForm';

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ)) notFound();

  const { locale, id } = await params;
  const player = await AdminPlayersQueryService.getById(id);
  if (!player) notFound();

  const canWrite = staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_PLAYERS_WRITE);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={String(player.name)} description={`Player id · ${id}`} backHref="/admin/players" backLabel="Players" />

      {canWrite ? (
        <AdminPlayerBasicsForm
          locale={locale}
          playerId={id}
          name={String(player.name ?? '')}
          country={player.country != null ? String(player.country) : null}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Read-only — missing players write capability.</p>
      )}

      <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(player, null, 2)}
      </pre>
    </div>
  );
}
