import React from 'react';
import { notFound } from 'next/navigation';
import { AdminFeedbackQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminFeedbackTable } from '@/features/admin/support/AdminFeedbackTable';

export default async function AdminSupportFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; priority?: string; unread?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || '1'), 10) || 1);
  const status = typeof sp.status === 'string' && sp.status !== 'all' ? sp.status : undefined;
  const priority = typeof sp.priority === 'string' && sp.priority !== 'all' ? sp.priority : undefined;
  const unreadAdmin = sp.unread === '1';

  const { total, rows } = await AdminFeedbackQueryService.list({
    page,
    limit: 30,
    status,
    priority,
    unreadAdmin,
  });
  const totalPages = Math.max(1, Math.ceil(total / 30));

  const buildHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('page', String(p));
    if (status) u.set('status', status);
    if (priority) u.set('priority', priority);
    if (unreadAdmin) u.set('unread', '1');
    return `?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support · Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} tickets · page {page} of {totalPages}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label>
          Status
          <select name="status" defaultValue={status || 'all'} className="ml-2 rounded-md border border-border bg-background px-2 py-1">
            <option value="all">All</option>
            <option value="pending">pending</option>
            <option value="in-progress">in-progress</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue={priority || 'all'} className="ml-2 rounded-md border border-border bg-background px-2 py-1">
            <option value="all">All</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="unread" value="1" defaultChecked={unreadAdmin} />
          Unread by admin
        </label>
        <input type="hidden" name="page" value="1" />
        <button type="submit" className="rounded-md bg-primary px-3 py-1 text-primary-foreground">
          Apply
        </button>
      </form>

      <AdminFeedbackTable rows={rows} />

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
