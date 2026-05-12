import React from 'react';
import { notFound } from 'next/navigation';
import { AdminClubsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { Link } from '@/i18n/routing';

export default async function AdminClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_CLUBS_READ)) notFound();

  const { id } = await params;
  const club = await AdminClubsQueryService.getById(id);
  if (!club) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/clubs" className="text-sm text-muted-foreground hover:text-foreground">
        ← Clubs
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{String(club.name)}</h1>
        <p className="text-sm text-muted-foreground">Club id · {id}</p>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed">
        {JSON.stringify(club, null, 2)}
      </pre>
    </div>
  );
}
