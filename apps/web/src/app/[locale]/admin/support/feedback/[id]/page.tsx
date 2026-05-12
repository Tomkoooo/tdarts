import React from 'react';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { AdminFeedbackQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminFeedbackDetailPanel } from '@/features/admin/support/AdminFeedbackDetailPanel';
import { AdminSection } from '@/features/admin/components/AdminSection';

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ)) notFound();

  const { id } = await params;
  const raw = await AdminFeedbackQueryService.getById(id);
  if (!raw) notFound();

  const title = String(raw.title ?? '');
  const status = String(raw.status ?? '');
  const isReadByAdmin = Boolean(raw.isReadByAdmin);
  const requestId = raw.requestId ? String(raw.requestId) : '';

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} description={String(raw.email ?? '')} backHref="/admin/support/feedback" backLabel="Feedback" />

      {requestId && staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ) ? (
        <p className="text-sm">
          <Link
            className="text-primary underline"
            href={`/admin/observability/errors?requestId=${encodeURIComponent(requestId)}`}
          >
            Search error events for requestId
          </Link>
        </p>
      ) : null}

      <AdminFeedbackDetailPanel feedbackId={id} initialStatus={status} initialRead={isReadByAdmin} />

      <AdminSection title="Thread (JSON)">
        <pre className="max-h-[40vh] overflow-auto text-xs">{JSON.stringify(raw.messages ?? [], null, 2)}</pre>
      </AdminSection>

      <AdminSection title="Full document">
        <pre className="max-h-[50vh] overflow-auto text-xs">{JSON.stringify(raw, null, 2)}</pre>
      </AdminSection>
    </div>
  );
}
