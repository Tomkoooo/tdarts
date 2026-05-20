'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink, IconPlus } from '@tabler/icons-react';

interface Ad {
  _id: string;
  title: string;
  placement: string;
  status: 'active' | 'paused' | 'scheduled' | 'expired';
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
}

const mockAds: Ad[] = [
  { _id: '1', title: 'Summer Sale Banner', placement: 'Homepage Hero', status: 'active', impressions: 45200, clicks: 1230, startDate: '2024-06-01', endDate: '2024-08-31' },
  { _id: '2', title: 'Tournament Sponsor', placement: 'Tournament Page', status: 'active', impressions: 28400, clicks: 890, startDate: '2024-05-15', endDate: '2024-12-31' },
  { _id: '3', title: 'Black Friday Promo', placement: 'Sidebar', status: 'scheduled', impressions: 0, clicks: 0, startDate: '2024-11-20', endDate: '2024-11-30' },
  { _id: '4', title: 'Old Campaign', placement: 'Footer', status: 'expired', impressions: 12000, clicks: 340, startDate: '2024-01-01', endDate: '2024-03-31' },
];

const statusColors: Record<Ad['status'], string> = {
  active: 'bg-admin-success/15 text-admin-success',
  paused: 'bg-admin-warning/15 text-admin-warning',
  scheduled: 'bg-admin-info/15 text-admin-info',
  expired: 'bg-admin-surface-elevated text-admin-on-surface-variant',
};

const columns: ColumnDef<Ad>[] = [
  {
    accessorKey: 'title',
    header: 'Campaign',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.title}</span>
    ),
  },
  {
    accessorKey: 'placement',
    header: 'Placement',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.placement}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[row.original.status]}`}>
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'impressions',
    header: 'Impressions',
    cell: ({ row }) => (
      <span className="text-admin-on-surface admin-text-mono-data">{row.original.impressions.toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'clicks',
    header: 'Clicks',
    cell: ({ row }) => (
      <span className="text-admin-on-surface admin-text-mono-data">{row.original.clicks.toLocaleString()}</span>
    ),
  },
  {
    id: 'ctr',
    header: 'CTR',
    cell: ({ row }) => {
      const ctr = row.original.impressions > 0 ? (row.original.clicks / row.original.impressions * 100).toFixed(2) : '0.00';
      return <span className="text-admin-on-surface admin-text-mono-data">{ctr}%</span>;
    },
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <Button variant="ghost" size="sm" className="text-admin-on-surface-variant hover:text-admin-on-surface">
        <IconExternalLink className="w-4 h-4" />
      </Button>
    ),
  },
];

export default function AdminAdsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (ad: Ad) => {
    router.push(`/${locale}/admin/ads/${ad._id}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ads"
        description="Manage advertising campaigns and track performance"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
              <IconRefresh className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <IconPlus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        }
      />

      {mockAds.length === 0 ? (
        <AdminEmptyState
          icon="ad_units"
          title="No ads found"
          description="Create your first advertising campaign to get started."
          actionLabel="Create Campaign"
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockAds}
          searchKey="title"
          searchPlaceholder="Search campaigns..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
