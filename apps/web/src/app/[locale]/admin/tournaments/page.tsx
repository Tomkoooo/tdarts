import React from 'react';
import { notFound } from 'next/navigation';
import { AdminTournamentsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminTournamentsTable } from '@/features/admin/tournaments/AdminTournamentsTable';

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; clubId?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || '1'), 10) || 1);
  const q = typeof sp.q === 'string' ? sp.q : '';
  const status = typeof sp.status === 'string' && sp.status !== 'all' ? sp.status : undefined;
  const clubId = typeof sp.clubId === 'string' ? sp.clubId : undefined;

  const { total, rows } = await AdminTournamentsQueryService.list({ q, page, limit: 25, status, clubId });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('page', String(p));
    if (q) u.set('q', q);
    if (status) u.set('status', status);
    if (clubId) u.set('clubId', clubId);
    return `?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tournaments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} tournaments · page {page} of {totalPages}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="text-muted-foreground">Search</span>
          <input name="q" defaultValue={q} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Status</span>
          <select name="status" defaultValue={status || 'all'} className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="all">All</option>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="group-stage">group-stage</option>
            <option value="knockout">knockout</option>
            <option value="finished">finished</option>
          </select>
        </label>
        <label className="min-w-[200px] text-sm">
          <span className="text-muted-foreground">Club id</span>
          <input
            name="clubId"
            defaultValue={clubId || ''}
            placeholder="Mongo ObjectId"
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
          />
        </label>
        <input type="hidden" name="page" value="1" />
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Filter
        </button>
      </form>

      <AdminTournamentsTable rows={rows} />

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
