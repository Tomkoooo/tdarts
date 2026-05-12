import React from 'react';
import { Link } from '@/i18n/routing';
import { AdminDashboardService } from '@tdarts/services';
import { AdminMetric } from '@/features/admin/components/AdminMetric';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { notFound } from 'next/navigation';
import { AdminDashboardCharts } from '@/features/admin/dashboard/AdminDashboardCharts';

export default async function AdminDashboardPage() {
  const session = await getStaffSession();
  if (!session) notFound();
  if (!staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_SHELL)) notFound();

  const summary = await AdminDashboardService.getSummary();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational snapshot of the platform.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Users (total)" value={summary.usersTotal} entity="users" href="/admin/users" />
        <AdminMetric label="New users (7d)" value={summary.usersLast7d} entity="user" format="count" />
        <AdminMetric label="Active clubs" value={summary.clubsActive} entity="club" href="/admin/clubs" />
        <AdminMetric
          label="Open urgent feedback"
          value={summary.feedbackOpenHigh}
          entity="default"
          format="count"
          hint="pending / in-progress · high or critical"
          href="/admin/support/feedback"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        <AdminMetric
          label="API error events (24h)"
          value={summary.apiErrorEvents24h}
          entity="default"
          format="count"
          hint="Approximate count from error event collection"
          href="/admin/observability/errors"
        />
      </div>

      <AdminDashboardCharts
        summary={{
          userSignupsByDay: summary.userSignupsByDay,
          feedbackOpenByPriority: summary.feedbackOpenByPriority,
          topErrorRoutes: summary.topErrorRoutes,
          apiErrorEvents24h: summary.apiErrorEvents24h,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">Tournaments by status</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(summary.tournamentsByStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-border/30 py-1 last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="tabular-nums">{v}</span>
              </li>
            ))}
            {Object.keys(summary.tournamentsByStatus).length === 0 ? (
              <li className="text-muted-foreground">No data</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">Recent stress runs</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.stressRunsRecent.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-border/30 pb-2 last:border-0">
                <span className="font-mono text-xs text-muted-foreground">{r.id.slice(-8)}</span>
                <span>{r.status}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              </li>
            ))}
            {summary.stressRunsRecent.length === 0 ? (
              <li className="text-muted-foreground">No stress runs</li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-primary hover:underline" href="/admin/tournaments">
          Browse tournaments
        </Link>
        <Link className="text-primary hover:underline" href="/admin/clubs">
          Browse clubs
        </Link>
        {staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ) ? (
          <Link className="text-primary hover:underline" href="/admin/observability/logs">
            View logs
          </Link>
        ) : null}
      </div>
    </div>
  );
}
