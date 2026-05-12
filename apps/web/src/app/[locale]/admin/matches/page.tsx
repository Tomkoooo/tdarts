import React from 'react';
import { notFound } from 'next/navigation';
import { AdminMatchesQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminMatchesTable } from '@/features/admin/matches/AdminMatchesTable';

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; manual?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_MATCHES_READ)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || '1'), 10) || 1);
  const q = typeof sp.q === 'string' ? sp.q : '';
  const manualOnly = sp.manual === '1';

  const { total, rows } = await AdminMatchesQueryService.list({ q, page, limit: 25, manualOnly });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('page', String(p));
    if (q) u.set('q', q);
    if (manualOnly) u.set('manual', '1');
    return `?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} matches · page {page} of {totalPages}. Filter by tournament Mongo id.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label className="min-w-[200px] flex-1">
          <span className="text-muted-foreground">Tournament Mongo id</span>
          <input name="q" defaultValue={q} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="manual" value="1" defaultChecked={manualOnly} />
          Manual override only
        </label>
        <input type="hidden" name="page" value="1" />
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
          Apply
        </button>
      </form>

      <AdminMatchesTable rows={rows} />

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
