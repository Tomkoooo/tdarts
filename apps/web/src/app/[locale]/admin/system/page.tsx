import React from 'react';
import { notFound } from 'next/navigation';
import { getSystemSettings } from '@tdarts/core/system-settings';
import { AdminSystemStatsService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { SystemSettingsForm } from '@/features/admin/system/SystemSettingsForm';
import { AdminMetric } from '@/features/admin/components/AdminMetric';
import { AdminSection } from '@/features/admin/components/AdminSection';

export default async function AdminSystemPage() {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SYSTEM_READ)) notFound();

  const initial = await getSystemSettings();
  const canWrite = staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SYSTEM_WRITE);
  let stats = null;
  if (session.isSuperAdmin) {
    try {
      stats = await AdminSystemStatsService.getStats();
    } catch {
      stats = null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime toggles and subscription paywall. {canWrite ? '' : 'Read-only.'}
        </p>
      </div>

      <SystemSettingsForm initial={initial} readOnly={!canWrite} />

      {stats ? (
        <AdminSection title="Database footprint (super-admin)" description="Estimated counts; expensive stats may be capped.">
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminMetric
              label="Data size"
              value={`${(stats.dataSizeBytes / (1024 * 1024)).toFixed(2)} MB`}
              format="text"
              hint={`${stats.dataSizeBytes} bytes`}
            />
            <AdminMetric
              label="Storage size"
              value={`${(stats.storageSizeBytes / (1024 * 1024)).toFixed(2)} MB`}
              format="text"
              hint={`${stats.storageSizeBytes} bytes`}
            />
            <AdminMetric
              label="Index size"
              value={`${(stats.indexSizeBytes / (1024 * 1024)).toFixed(2)} MB`}
              format="text"
              hint={`${stats.indexSizeBytes} bytes`}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Database: <span className="font-mono">{stats.dbName}</span>
          </p>
          <div className="mt-4 max-h-64 overflow-auto rounded-md border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">Collection</th>
                  <th className="px-2 py-1">Est. docs</th>
                </tr>
              </thead>
              <tbody>
                {stats.collections.map((c) => (
                  <tr key={c.name} className="border-t border-border/40">
                    <td className="px-2 py-1 font-mono">{c.name}</td>
                    <td className="px-2 py-1 tabular-nums">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      ) : session.isSuperAdmin ? (
        <p className="text-sm text-muted-foreground">Database stats unavailable (connection or permissions).</p>
      ) : null}

      {stats ? (
        <AdminSection title={`Yearly wrap (${stats.yearlyWrap.year})`} description="Counts since Jan 1 UTC (approximate operational view).">
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminMetric label="Users created (YTD)" value={stats.yearlyWrap.usersCreated} entity="user" />
            <AdminMetric label="Tournaments finished (YTD)" value={stats.yearlyWrap.tournamentsFinished} entity="tournament" />
            <AdminMetric label="Clubs created (YTD)" value={stats.yearlyWrap.clubsCreated} entity="club" />
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}
