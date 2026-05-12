import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPlaceholder } from '@/features/admin/components/AdminPlaceholder';

export default async function AdminAdsCampaignsPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_ADS_READ)) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Ads · Campaigns</h1>
      <AdminPlaceholder title="Campaign list" />
    </div>
  );
}
