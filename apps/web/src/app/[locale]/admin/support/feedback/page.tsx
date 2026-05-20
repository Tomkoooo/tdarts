'use client';

import { AdminPageHeader, AdminEmptyState } from '@/features/admin/components';
import { AdminDataTable } from '@/features/admin/components/admin-data-table';
import { Button } from '@/components/ui/Button';
import { useRouter, useParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { IconRefresh, IconExternalLink, IconCheck, IconX } from '@tabler/icons-react';

interface Feedback {
  _id: string;
  subject: string;
  user: string;
  type: 'bug' | 'feature' | 'general' | 'complaint';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

const mockFeedback: Feedback[] = [
  { _id: '1', subject: 'Tournament bracket not loading', user: 'player1@email.com', type: 'bug', status: 'new', priority: 'high', createdAt: '2024-06-25' },
  { _id: '2', subject: 'Request: Dark mode for mobile', user: 'user@email.com', type: 'feature', status: 'in_progress', priority: 'medium', createdAt: '2024-06-24' },
  { _id: '3', subject: 'Great platform!', user: 'happy@user.com', type: 'general', status: 'closed', priority: 'low', createdAt: '2024-06-23' },
  { _id: '4', subject: 'Payment issue', user: 'premium@user.com', type: 'complaint', status: 'resolved', priority: 'high', createdAt: '2024-06-22' },
];

const statusColors: Record<Feedback['status'], string> = {
  new: 'bg-admin-info/15 text-admin-info',
  in_progress: 'bg-admin-warning/15 text-admin-warning',
  resolved: 'bg-admin-success/15 text-admin-success',
  closed: 'bg-admin-surface-elevated text-admin-on-surface-variant',
};

const priorityColors: Record<Feedback['priority'], string> = {
  high: 'bg-admin-error/15 text-admin-error',
  medium: 'bg-admin-warning/15 text-admin-warning',
  low: 'bg-admin-surface-elevated text-admin-on-surface-variant',
};

const typeColors: Record<Feedback['type'], string> = {
  bug: 'bg-admin-error/15 text-admin-error',
  feature: 'bg-admin-info/15 text-admin-info',
  general: 'bg-admin-surface-elevated text-admin-on-surface-variant',
  complaint: 'bg-admin-warning/15 text-admin-warning',
};

const columns: ColumnDef<Feedback>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: ({ row }) => (
      <span className="font-medium text-admin-on-surface">{row.original.subject}</span>
    ),
  },
  {
    accessorKey: 'user',
    header: 'User',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant">{row.original.user}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[row.original.type]}`}>
        {row.original.type}
      </span>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[row.original.priority]}`}>
        {row.original.priority}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[row.original.status]}`}>
        {row.original.status.replace('_', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-admin-on-surface-variant text-xs admin-text-mono-data">
        {row.original.createdAt}
      </span>
    ),
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

export default function AdminFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleRowClick = (feedback: Feedback) => {
    router.push(`/${locale}/admin/support/feedback/${feedback._id}`);
  };

  const newCount = mockFeedback.filter((f) => f.status === 'new').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feedback"
        description={`Manage user feedback and support requests${newCount > 0 ? ` (${newCount} new)` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
              <IconRefresh className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="border-admin-success/50 text-admin-success hover:bg-admin-success/10">
              <IconCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        }
      />

      {mockFeedback.length === 0 ? (
        <AdminEmptyState
          icon="feedback"
          title="No feedback yet"
          description="User feedback will appear here once submitted."
        />
      ) : (
        <AdminDataTable
          columns={columns}
          data={mockFeedback}
          searchKey="subject"
          searchPlaceholder="Search feedback..."
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
