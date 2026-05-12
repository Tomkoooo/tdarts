import React from 'react';
import { notFound } from 'next/navigation';
import { AdminObservabilityService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import {
  AdminObservabilityLogsTable,
  type AdminLogRow,
} from '@/features/admin/observability/AdminObservabilityLogsTable';
import { ObservabilityLogsExportButton } from '@/features/admin/observability/ObservabilityLogsExportButton';

export default async function AdminObservabilityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; category?: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ)) notFound();

  const sp = await searchParams;
  const level = sp.level as 'error' | 'warn' | 'info' | 'debug' | undefined;
  const category = sp.category as 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database' | undefined;

  const raw = await AdminObservabilityService.listLogs({
    level: level && ['error', 'warn', 'info', 'debug'].includes(level) ? level : undefined,
    category:
      category && ['auth', 'club', 'tournament', 'player', 'user', 'api', 'system', 'database'].includes(category)
        ? category
        : undefined,
    limit: 120,
  });

  const rows: AdminLogRow[] = raw.map((l) => {
    const ts = l.timestamp as unknown;
    return {
      id: String(l._id ?? ''),
      level: String(l.level ?? ''),
      category: String(l.category ?? ''),
      message: String(l.message ?? ''),
      timestamp: ts instanceof Date ? ts.toISOString() : String(ts ?? ''),
      operation: l.operation ? String(l.operation) : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Latest entries (capped).</p>
        </div>
        <ObservabilityLogsExportButton rows={rows} />
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label>
          Level
          <select name="level" defaultValue={level || ''} className="ml-2 rounded-md border border-border bg-background px-2 py-1">
            <option value="">All</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>
        </label>
        <label>
          Category
          <select name="category" defaultValue={category || ''} className="ml-2 rounded-md border border-border bg-background px-2 py-1">
            <option value="">All</option>
            <option value="auth">auth</option>
            <option value="club">club</option>
            <option value="tournament">tournament</option>
            <option value="player">player</option>
            <option value="user">user</option>
            <option value="api">api</option>
            <option value="system">system</option>
            <option value="database">database</option>
          </select>
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-1 text-primary-foreground">
          Apply
        </button>
      </form>

      <AdminObservabilityLogsTable rows={rows} />
    </div>
  );
}
