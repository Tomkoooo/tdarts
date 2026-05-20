'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { TrendChart, KpiCard, StatsGrid } from '@/features/admin/components';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconEdit, IconPlayerPause, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';

const mockAd = {
  _id: '1',
  title: 'Summer Sale Banner',
  placement: 'Homepage Hero',
  status: 'active',
  impressions: 45200,
  clicks: 1230,
  startDate: '2024-06-01',
  endDate: '2024-08-31',
  targetUrl: 'https://example.com/summer-sale',
  budget: 50000,
  spent: 32500,
  createdAt: '2024-05-15T10:00:00Z',
};

const mockPerformanceData = [
  { label: 'Week 1', value: 5200 },
  { label: 'Week 2', value: 6800 },
  { label: 'Week 3', value: 7500 },
  { label: 'Week 4', value: 8200 },
  { label: 'Week 5', value: 9100 },
  { label: 'Week 6', value: 8400 },
];

export default function AdminAdDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const adId = params.adId as string;

  const ctr = mockAd.impressions > 0 ? (mockAd.clicks / mockAd.impressions * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/ads`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockAd.title}
          description={mockAd.placement}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconPlayerPause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconEdit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" size="sm">
                <IconTrash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          }
        />
      </div>

      {/* KPIs */}
      <StatsGrid columns={4}>
        <KpiCard title="Impressions" value={mockAd.impressions} />
        <KpiCard title="Clicks" value={mockAd.clicks} />
        <KpiCard title="CTR" value={`${ctr}%`} />
        <KpiCard title="Budget Used" value={`${((mockAd.spent / mockAd.budget) * 100).toFixed(0)}%`} />
      </StatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TrendChart
            title="Weekly Impressions"
            data={mockPerformanceData}
            color="primary"
            height={280}
          />

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Campaign Details
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Campaign ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{adId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Target URL</dt>
                <dd className="mt-1 text-sm text-admin-primary truncate">{mockAd.targetUrl}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Start Date</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockAd.startDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">End Date</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockAd.endDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Budget</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockAd.budget.toLocaleString()} HUF</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Spent</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockAd.spent.toLocaleString()} HUF</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Status
            </h3>
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-admin-success/15 text-admin-success capitalize">
              {mockAd.status}
            </span>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Budget Progress
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-admin-on-surface-variant">Spent</span>
                <span className="text-admin-on-surface font-medium">{mockAd.spent.toLocaleString()} HUF</span>
              </div>
              <div className="h-2 bg-admin-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-admin-primary rounded-full transition-all"
                  style={{ width: `${(mockAd.spent / mockAd.budget) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-admin-on-surface-variant">0</span>
                <span className="text-admin-on-surface-variant">{mockAd.budget.toLocaleString()} HUF</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
