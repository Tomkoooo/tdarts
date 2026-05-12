import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPlaceholder } from '@/features/admin/components/AdminPlaceholder';

export default async function AdminContentPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_CONTENT_READ)) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
      <AdminPlaceholder title="Announcements, posts, email templates" />
    </div>
  );
}
