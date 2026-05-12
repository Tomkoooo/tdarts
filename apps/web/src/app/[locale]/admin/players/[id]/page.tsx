import React from 'react';
import { notFound } from 'next/navigation';
import { AdminPlayersQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { Link } from '@/i18n/routing';

export default async function AdminPlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ)) notFound();

  const { id } = await params;
  const player = await AdminPlayersQueryService.getById(id);
  if (!player) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/players" className="text-sm text-muted-foreground hover:text-foreground">
        ← Players
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{String(player.name)}</h1>
        <p className="text-sm text-muted-foreground">Player id · {id}</p>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(player, null, 2)}
      </pre>
    </div>
  );
}
