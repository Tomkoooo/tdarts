'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { AdminChartCard } from '@/features/admin/components/AdminChartCard';
import type { AdminDashboardSummary } from '@tdarts/services';

type Props = {
  summary: Pick<
    AdminDashboardSummary,
    'userSignupsByDay' | 'feedbackOpenByPriority' | 'topErrorRoutes' | 'apiErrorEvents24h'
  >;
};

export function AdminDashboardCharts({ summary }: Props) {
  const signups = summary.userSignupsByDay.map((d) => ({ day: d.day, count: d.count }));
  const pri = Object.entries(summary.feedbackOpenByPriority).map(([priority, count]) => ({ priority, count }));
  const routes = summary.topErrorRoutes.map((r) => ({
    name: `${r.method} ${r.routeKey}`.slice(0, 48),
    errors: r.errors,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AdminChartCard
        title="User signups (14d)"
        description="New accounts excluding soft-deleted filter in aggregation."
        isEmpty={signups.length === 0}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={signups}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis width={32} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <AdminChartCard
        title="Open feedback by priority"
        description="Tickets in pending or in-progress."
        isEmpty={pri.length === 0}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={pri}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="priority" tick={{ fontSize: 10 }} />
            <YAxis width={32} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <AdminChartCard
        title="API errors by route (24h)"
        description={`Raw error events (24h): ${summary.apiErrorEvents24h}. Aggregated metrics bucket may differ. Mongo TTL: 7 days.`}
        isEmpty={routes.length === 0}
        className="lg:col-span-2"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={routes} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="errors" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </AdminChartCard>
    </div>
  );
}
