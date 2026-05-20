'use client';

import { AdminBreadcrumbLabelSetter } from '@/features/admin/providers/AdminBreadcrumbLabelContext';

export function AdminDetailBreadcrumb({ label }: { label: string }) {
  return <AdminBreadcrumbLabelSetter label={label} />;
}
