import React from 'react';
import { notFound } from 'next/navigation';
import { AdminLeaguesQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ)) notFound();

  const { id } = await params;
  const league = await AdminLeaguesQueryService.getById(id);
  if (!league) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader title={String(league.name)} description={`League id · ${id}`} backHref="/admin/leagues" backLabel="Leagues" />
      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(league, null, 2)}
      </pre>
    </div>
  );
}
