import React from 'react';
import { notFound } from 'next/navigation';
import { AdminClubsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminClubFlagsForm } from '@/features/admin/clubs/AdminClubFlagsForm';

export default async function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_CLUBS_READ)) notFound();

  const { locale, id } = await params;
  const club = await AdminClubsQueryService.getById(id);
  if (!club) notFound();

  const canWrite = staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_CLUBS_WRITE);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={String(club.name)} description={`Club id · ${id}`} backHref="/admin/clubs" backLabel="Clubs" />

      {canWrite ? (
        <AdminClubFlagsForm
          locale={locale}
          clubId={id}
          verified={Boolean(club.verified)}
          isActive={Boolean(club.isActive)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Read-only — missing clubs write capability.</p>
      )}

      <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(club, null, 2)}
      </pre>
    </div>
  );
}
