'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconMessageReply, IconTrash } from '@tabler/icons-react';

const mockFeedback = {
  _id: '1',
  subject: 'Tournament bracket not loading',
  user: { email: 'player1@email.com', name: 'John Player' },
  type: 'bug',
  status: 'new',
  priority: 'high',
  message: 'When I try to view the tournament bracket for the Summer Championship, the page shows a loading spinner but never actually loads the bracket. This has been happening for the past 2 days. I tried clearing my cache and using a different browser but the issue persists.',
  browser: 'Chrome 125.0',
  platform: 'Windows 11',
  createdAt: '2024-06-25T10:30:00Z',
  updatedAt: '2024-06-25T10:30:00Z',
};

const statusColors: Record<string, string> = {
  new: 'bg-admin-info/15 text-admin-info',
  in_progress: 'bg-admin-warning/15 text-admin-warning',
  resolved: 'bg-admin-success/15 text-admin-success',
  closed: 'bg-admin-surface-elevated text-admin-on-surface-variant',
};

const priorityColors: Record<string, string> = {
  high: 'bg-admin-error/15 text-admin-error',
  medium: 'bg-admin-warning/15 text-admin-warning',
  low: 'bg-admin-surface-elevated text-admin-on-surface-variant',
};

export default function AdminFeedbackDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const feedbackId = params.feedbackId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/support/feedback`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockFeedback.subject}
          description={`From ${mockFeedback.user.email}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconMessageReply className="w-4 h-4 mr-2" />
                Reply
              </Button>
              <Button variant="outline" size="sm" className="border-admin-success/50 text-admin-success hover:bg-admin-success/10">
                <IconCheck className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
              <Button variant="destructive" size="sm">
                <IconTrash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Message
            </h3>
            <p className="text-sm text-admin-on-surface whitespace-pre-wrap leading-relaxed">
              {mockFeedback.message}
            </p>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Reply
            </h3>
            <textarea
              className="w-full h-32 px-4 py-3 rounded-lg bg-admin-surface-elevated border border-admin-outline-variant/30 text-admin-on-surface text-sm placeholder:text-admin-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-admin-primary/50 resize-none"
              placeholder="Type your reply..."
            />
            <div className="flex justify-end mt-3">
              <Button size="sm">
                <IconMessageReply className="w-4 h-4 mr-2" />
                Send Reply
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Details
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Ticket ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{feedbackId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Type</dt>
                <dd className="mt-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-admin-error/15 text-admin-error">
                    {mockFeedback.type}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Status</dt>
                <dd className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[mockFeedback.status]}`}>
                    {mockFeedback.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Priority</dt>
                <dd className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[mockFeedback.priority]}`}>
                    {mockFeedback.priority}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Created</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockFeedback.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              User Info
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Name</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockFeedback.user.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Email</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockFeedback.user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Browser</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockFeedback.browser}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Platform</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockFeedback.platform}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
