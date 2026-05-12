import React from 'react';
import { notFound } from 'next/navigation';
import { getSystemSettings } from '@tdarts/core/system-settings';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { SystemSettingsForm } from '@/features/admin/system/SystemSettingsForm';

export default async function AdminSystemPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SYSTEM_READ)) notFound();

  const initial = await getSystemSettings();
  const canWrite = staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SYSTEM_WRITE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime toggles and subscription paywall. {canWrite ? '' : 'Read-only.'}
        </p>
      </div>
      <SystemSettingsForm initial={initial} readOnly={!canWrite} />
    </div>
  );
}
