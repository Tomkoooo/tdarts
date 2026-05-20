'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconEdit, IconKey, IconTrash } from '@tabler/icons-react';

// Mock data
const mockUser = {
  _id: '1',
  email: 'admin@tdarts.hu',
  username: 'admin',
  isAdmin: true,
  isVerified: true,
  isDeleted: false,
  adminRoles: ['marketing'],
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-06-20T14:45:00Z',
  lastLogin: '2024-06-25T09:00:00Z',
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const userId = params.userId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/users`}
          className="p-2 rounded-md hover:bg-admin-surface-container text-admin-on-surface-variant hover:text-admin-on-surface transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <AdminPageHeader
          title={mockUser.username}
          description={mockUser.email}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
                <IconKey className="w-4 h-4 mr-2" />
                Reset Password
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Account Information
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">User ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{userId}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Username</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockUser.username}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Email</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{mockUser.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Created</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockUser.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Last Updated</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockUser.updatedAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Last Login</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{new Date(mockUser.lastLogin).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          {/* Audit Log Placeholder */}
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Activity Log
            </h3>
            <p className="text-sm text-admin-on-surface-variant">
              Audit log entries will appear here when connected to backend services.
            </p>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Status Flags */}
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Flags
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Admin</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockUser.isAdmin ? 'bg-admin-primary/15 text-admin-primary' : 'bg-admin-surface-elevated text-admin-on-surface-variant'
                }`}>
                  {mockUser.isAdmin ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Verified</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockUser.isVerified ? 'bg-admin-success/15 text-admin-success' : 'bg-admin-warning/15 text-admin-warning'
                }`}>
                  {mockUser.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-admin-on-surface">Deleted</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mockUser.isDeleted ? 'bg-admin-error/15 text-admin-error' : 'bg-admin-surface-elevated text-admin-on-surface-variant'
                }`}>
                  {mockUser.isDeleted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Roles */}
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Admin Roles
            </h3>
            {mockUser.adminRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mockUser.adminRoles.map((role) => (
                  <span key={role} className="px-2 py-1 rounded-md bg-admin-surface-elevated text-xs text-admin-on-surface">
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-admin-on-surface-variant">No admin roles assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
