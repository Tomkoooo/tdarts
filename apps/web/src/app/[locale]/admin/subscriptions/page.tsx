import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPlaceholder } from '@/features/admin/components/AdminPlaceholder';

export default async function AdminSubscriptionsPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SUBSCRIPTIONS_READ)) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
      <AdminPlaceholder title="Club subscription links" />
    </div>
  );
}
