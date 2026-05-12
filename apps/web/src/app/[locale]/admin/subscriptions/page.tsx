import React from 'react';
import { notFound } from 'next/navigation';
import { AdminSubscriptionsQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminSubscriptionsTable } from '@/features/admin/subscriptions/AdminSubscriptionsTable';

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SUBSCRIPTIONS_READ)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || '1'), 10) || 1);
  const { total, rows } = await AdminSubscriptionsQueryService.list({ page, limit: 40 });
  const totalPages = Math.max(1, Math.ceil(total / 40));

  const buildHref = (p: number) => `?page=${p}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} club follows · page {page} of {totalPages}
        </p>
      </div>
      <AdminSubscriptionsTable rows={rows} />
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
