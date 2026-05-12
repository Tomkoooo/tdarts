import React from 'react';
import { notFound } from 'next/navigation';
import { AdminObservabilityService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { ErrorEventResolveButton } from '@/features/admin/observability/ErrorEventResolveButton';

export default async function AdminObservabilityErrorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ)) notFound();

  const { id } = await params;
  const doc = await AdminObservabilityService.getApiErrorEventById(id);
  if (!doc) notFound();

  const isResolved = Boolean(doc.isResolved);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Error event"
        description={`${String(doc.method)} ${String(doc.routeKey)}`}
        backHref="/admin/observability/errors"
        backLabel="Error events"
      />

      <div className="flex flex-wrap items-center gap-3">
        <ErrorEventResolveButton eventId={id} isResolved={isResolved} />
        <span className="text-xs text-muted-foreground">
          Truncation: req {String(doc.requestBodyTruncated)} · res {String(doc.responseBodyTruncated)}
        </span>
      </div>

      {doc.errorMessage ? <p className="text-sm text-destructive">{String(doc.errorMessage)}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">Request body</h2>
          <pre className="mt-2 max-h-[50vh] overflow-auto text-xs">{doc.requestBody ? String(doc.requestBody) : '—'}</pre>
        </section>
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">Response body</h2>
          <pre className="mt-2 max-h-[50vh] overflow-auto text-xs">{doc.responseBody ? String(doc.responseBody) : '—'}</pre>
        </section>
      </div>

      <pre className="max-h-[40vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs">{JSON.stringify(doc, null, 2)}</pre>
    </div>
  );
}
