import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { FeatureAccessProbe } from '@/features/admin/feature-access/FeatureAccessProbe';

export default async function AdminFeatureAccessPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_FEATURE_ACCESS_DEBUG_READ)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feature access debugger</h1>
        <p className="mt-1 text-sm text-muted-foreground">Evaluate the current session against product feature gates.</p>
      </div>
      <FeatureAccessProbe />
    </div>
  );
}
