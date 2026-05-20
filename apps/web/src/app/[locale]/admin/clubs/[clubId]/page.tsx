'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconEdit, IconCheck, IconX } from '@tabler/icons-react';

const mockClub = {
  _id: '1',
  name: 'Budapest Darts Club',
  address: 'Andrassy ut 123, Budapest 1061',
  verified: true,
  isActive: true,
  memberCount: 45,
  description: 'Premier darts club in the heart of Budapest.',
  createdAt: '2024-01-10T10:30:00Z',
  updatedAt: '2024-06-15T14:00:00Z',
  owner: { name: 'John Smith', email: 'john@bdclub.hu' },
};

export default function AdminClubDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const clubId = params.clubId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/clubs`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockClub.name}
          description={mockClub.address}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconEdit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {mockClub.verified ? (
                <Button variant="outline" size="sm" className="border-admin-warning/50 text-admin-warning hover:bg-admin-warning/10">
                  <IconX className="w-4 h-4 mr-2" />
                  Revoke Verification
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="border-admin-success/50 text-admin-success hover:bg-admin-success/10">
                  <IconCheck className="w-4 h-4 mr-2" />
                  Verify Club
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Club Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Club ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{clubId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Name</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockClub.name}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-admin-on-surface-variant">Address</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockClub.address}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-admin-on-surface-variant">Description</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockClub.description}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Members</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockClub.memberCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Created</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockClub.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Owner Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Name</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockClub.owner.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Email</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockClub.owner.email}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Flags
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Verified</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockClub.verified ? 'bg-admin-success/15 text-admin-success' : 'bg-admin-warning/15 text-admin-warning'
                }`}>
                  {mockClub.verified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Active</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockClub.isActive ? 'bg-admin-primary/15 text-admin-primary' : 'bg-admin-surface-elevated text-admin-on-surface-variant'
                }`}>
                  {mockClub.isActive ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
