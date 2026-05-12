import React from 'react';
import { notFound } from 'next/navigation';
import { AdminObservabilityService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminErrorEventsTable, type ErrorEventRow } from '@/features/admin/observability/AdminErrorEventsTable';

export default async function AdminObservabilityErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string; resolved?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ)) notFound();

  const sp = await searchParams;
  const requestId = typeof sp.requestId === 'string' ? sp.requestId : undefined;
  const isResolved = sp.resolved === '1' ? true : sp.resolved === '0' ? false : undefined;

  const raw = await AdminObservabilityService.listApiErrorEvents({
    requestId,
    isResolved,
    limit: 100,
  });

  const rows: ErrorEventRow[] = raw.map((doc) => ({
    id: String(doc._id ?? ''),
    routeKey: String(doc.routeKey ?? ''),
    method: String(doc.method ?? ''),
    status: Number(doc.status) || 0,
    occurredAt: doc.occurredAt instanceof Date ? doc.occurredAt.toISOString() : String(doc.occurredAt ?? ''),
    requestId: doc.requestId ? String(doc.requestId) : undefined,
    isResolved: Boolean(doc.isResolved),
    requestBodyTruncated: Boolean(doc.requestBodyTruncated),
    responseBodyTruncated: Boolean(doc.responseBodyTruncated),
    errorMessage: doc.errorMessage ? String(doc.errorMessage) : undefined,
    requestBody: doc.requestBody ? String(doc.requestBody) : undefined,
    responseBody: doc.responseBody ? String(doc.responseBody) : undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Error events</h1>
        <p className="mt-1 text-sm text-muted-foreground">API / action / page telemetry errors (raw payloads when captured).</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label>
          requestId
          <input name="requestId" defaultValue={requestId || ''} className="ml-2 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs" />
        </label>
        <label>
          Resolved
          <select name="resolved" defaultValue={sp.resolved ?? ''} className="ml-2 rounded-md border border-border bg-background px-2 py-1">
            <option value="">All</option>
            <option value="0">Open</option>
            <option value="1">Resolved</option>
          </select>
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-1 text-primary-foreground">
          Apply
        </button>
      </form>

      <AdminErrorEventsTable rows={rows} />
    </div>
  );
}
