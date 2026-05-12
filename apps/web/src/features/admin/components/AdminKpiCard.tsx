import React from 'react';
import { AdminMetric } from '@/features/admin/components/AdminMetric';

/** @deprecated Prefer `AdminMetric` for new code — thin wrapper for backwards compatibility. */
export function AdminKpiCard(props: { title: string; value: React.ReactNode; hint?: string; href?: string }) {
  return <AdminMetric label={props.title} value={props.value} hint={props.hint} href={props.href} entity="default" format="text" />;
}
