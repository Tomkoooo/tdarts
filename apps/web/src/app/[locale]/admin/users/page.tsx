import React from 'react';
import { notFound } from 'next/navigation';
import { AdminUsersQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminUsersTable } from '@/features/admin/users/AdminUsersTable';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || '1'), 10) || 1);
  const q = typeof sp.q === 'string' ? sp.q : '';

  const { total, rows } = await AdminUsersQueryService.list({ q, page, limit: 25 });
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('page', String(p));
    if (q) u.set('q', q);
    return `?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} users · page {page} of {totalPages}</p>
      </div>

      <form className="flex max-w-xl flex-wrap items-end gap-2" method="get">
        <label className="flex-1 min-w-[200px] text-sm">
          <span className="text-muted-foreground">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="email, username, name"
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <input type="hidden" name="page" value="1" />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
      </form>

      <AdminUsersTable rows={rows} />

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
