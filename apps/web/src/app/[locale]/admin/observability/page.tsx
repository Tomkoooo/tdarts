'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { KpiCard, StatsGrid, TrendChart, BarChart } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { IconRefresh } from '@tabler/icons-react';

const mockMetrics = {
  requestsPerMinute: 1245,
  avgResponseTime: 48,
  errorRate: 0.12,
  activeConnections: 342,
};

const mockResponseTimeData = [
  { label: '00:00', value: 45 },
  { label: '04:00', value: 42 },
  { label: '08:00', value: 58 },
  { label: '12:00', value: 72 },
  { label: '16:00', value: 65 },
  { label: '20:00', value: 52 },
];

const mockErrorsByType = [
  { label: '4xx', value: 234 },
  { label: '5xx', value: 12 },
  { label: 'Timeout', value: 8 },
  { label: 'Network', value: 3 },
];

const mockRecentLogs = [
  { timestamp: '2024-06-25 14:32:15', level: 'error', message: 'Database connection timeout', source: 'api/tournaments' },
  { timestamp: '2024-06-25 14:30:42', level: 'warn', message: 'Rate limit exceeded for user', source: 'middleware' },
  { timestamp: '2024-06-25 14:28:10', level: 'info', message: 'Tournament created successfully', source: 'api/tournaments' },
  { timestamp: '2024-06-25 14:25:33', level: 'error', message: 'Payment webhook validation failed', source: 'api/webhooks' },
  { timestamp: '2024-06-25 14:22:18', level: 'info', message: 'User registration completed', source: 'api/auth' },
];

const levelColors: Record<string, string> = {
  error: 'bg-admin-error/15 text-admin-error',
  warn: 'bg-admin-warning/15 text-admin-warning',
  info: 'bg-admin-info/15 text-admin-info',
};

export default function AdminObservabilityPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Observability"
        description="Monitor system health, performance, and logs"
        actions={
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* KPIs */}
      <StatsGrid columns={4}>
        <KpiCard title="Requests/min" value={mockMetrics.requestsPerMinute} />
        <KpiCard title="Avg Response Time" value={`${mockMetrics.avgResponseTime}ms`} />
        <KpiCard title="Error Rate" value={`${mockMetrics.errorRate}%`} trend={mockMetrics.errorRate > 1 ? 'down' : 'up'} />
        <KpiCard title="Active Connections" value={mockMetrics.activeConnections} />
      </StatsGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          title="Response Time (24h)"
          data={mockResponseTimeData}
          color="primary"
          height={240}
        />
        <BarChart
          title="Errors by Type"
          data={mockErrorsByType}
          color="error"
          height={240}
        />
      </div>

      {/* Recent Logs */}
      <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-admin-outline-variant/20 flex items-center justify-between">
          <h3 className="text-sm font-medium text-admin-on-surface">Recent Logs</h3>
          <Button variant="ghost" size="sm" className="text-admin-on-surface-variant">
            View All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-admin-outline-variant/20">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-on-surface-variant">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-on-surface-variant">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-on-surface-variant">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-on-surface-variant">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {mockRecentLogs.map((log, index) => (
                <tr key={index} className="border-b border-admin-outline-variant/10 last:border-0 hover:bg-admin-surface-elevated/50">
                  <td className="px-4 py-3 text-xs text-admin-on-surface-variant admin-text-mono-data whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${levelColors[log.level]}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-admin-on-surface">
                    {log.message}
                  </td>
                  <td className="px-4 py-3 text-xs text-admin-on-surface-variant admin-text-mono-data">
                    {log.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
