import React from 'react';
import { notFound } from 'next/navigation';
import { AdminObservabilityService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminApiMetricsTable, type ApiMetricRow } from '@/features/admin/observability/AdminApiMetricsTable';

export default async function AdminObservabilityApiPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ)) notFound();

  const raw = await AdminObservabilityService.listApiRequestMetrics({ limit: 150 });
  const rows: ApiMetricRow[] = raw.map((doc, i) => {
    const count = Number(doc.count) || 0;
    const totalMs = Number(doc.totalDurationMs) || 0;
    const bucket = doc.bucket;
    return {
      id: `${i}-${doc.routeKey}-${doc.method}`,
      bucket: bucket instanceof Date ? bucket.toISOString() : String(bucket ?? ''),
      routeKey: String(doc.routeKey ?? ''),
      method: String(doc.method ?? ''),
      count,
      errorCount: Number(doc.errorCount) || 0,
      timeoutCount: Number(doc.timeoutCount) || 0,
      avgMs: count ? Math.round(totalMs / count) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API metrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent aggregated request metrics (capped).</p>
      </div>
      <AdminApiMetricsTable rows={rows} />
    </div>
  );
}
