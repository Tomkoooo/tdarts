import React from 'react';
import { notFound } from 'next/navigation';
import { AdminClubsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminClubsTable } from '@/features/admin/clubs/AdminClubsTable';

export default async function AdminClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; verified?: string; active?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_CLUBS_READ)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || '1'), 10) || 1);
  const q = typeof sp.q === 'string' ? sp.q : '';
  const verified = sp.verified === 'yes' || sp.verified === 'no' ? sp.verified : 'all';
  const isActive = sp.active === 'yes' || sp.active === 'no' ? sp.active : 'all';

  const { total, rows } = await AdminClubsQueryService.list({ q, page, limit: 25, verified, isActive });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('page', String(p));
    if (q) u.set('q', q);
    if (verified !== 'all') u.set('verified', verified);
    if (isActive !== 'all') u.set('active', isActive);
    return `?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clubs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} clubs · page {page} of {totalPages}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="min-w-[200px] flex-1 text-sm">
          <span className="text-muted-foreground">Search</span>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Verified</span>
          <select name="verified" defaultValue={verified} className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Active</span>
          <select name="active" defaultValue={isActive} className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <input type="hidden" name="page" value="1" />
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Filter
        </button>
      </form>

      <AdminClubsTable rows={rows} />

      <div className="flex gap-3 text-sm">
        {page > 1 ? (
          <a className="text-primary hover:underline" href={buildHref(page - 1)}>
            Previous
          </a>
        ) : null}
        {page < totalPages ? (
          <a className="text-primary hover:underline" href={buildHref(page + 1)}>
            Next
          </a>
        ) : null}
      </div>
    </div>
  );
}
