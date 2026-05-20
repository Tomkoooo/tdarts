'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { IconSearch, IconCheck, IconX } from '@tabler/icons-react';

export default function AdminFeatureAccessPage() {
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<null | {
    user: { _id: string; email: string; username: string };
    capabilities: string[];
    features: { name: string; eligible: boolean; reason: string }[];
  }>(null);

  const handleCheck = () => {
    // Mock result for demonstration
    setResult({
      user: {
        _id: userId || 'mock-user-id',
        email: 'test@example.com',
        username: 'testuser',
      },
      capabilities: [
        'admin:shell:access',
        'admin:users:manage',
        'admin:clubs:read',
      ],
      features: [
        { name: 'Premium Dashboard', eligible: true, reason: 'Active subscription' },
        { name: 'Advanced Analytics', eligible: true, reason: 'Premium tier' },
        { name: 'Custom Branding', eligible: false, reason: 'Requires Enterprise tier' },
        { name: 'API Access', eligible: true, reason: 'Enabled for all users' },
        { name: 'Bulk Export', eligible: false, reason: 'Not included in current plan' },
        { name: 'White Label', eligible: false, reason: 'Enterprise only feature' },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature Access Debug"
        description="Check feature eligibility and capabilities for any user"
      />

      {/* Search */}
      <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
        <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
          Check User Eligibility
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-on-surface-variant" />
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-admin-surface-elevated border border-admin-outline-variant/30 text-admin-on-surface text-sm placeholder:text-admin-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-admin-primary/50"
            />
          </div>
          <Button onClick={handleCheck}>
            <IconSearch className="w-4 h-4 mr-2" />
            Check
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info */}
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              User Info
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-admin-on-surface-variant">User ID</dt>
                <dd className="mt-1 text-sm text-admin-on-surface admin-text-mono-data">{result.user._id}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Email</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{result.user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-on-surface-variant">Username</dt>
                <dd className="mt-1 text-sm text-admin-on-surface">{result.user.username}</dd>
              </div>
            </dl>
          </div>

          {/* Capabilities */}
          <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Admin Capabilities
            </h3>
            {result.capabilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-1 rounded-md bg-admin-surface-elevated text-xs text-admin-on-surface admin-text-mono-data"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-admin-on-surface-variant">No admin capabilities</p>
            )}
          </div>

          {/* Feature Eligibility */}
          <div className="lg:col-span-2 rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
            <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
              Feature Eligibility
            </h3>
            <div className="space-y-2">
              {result.features.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-center justify-between py-3 border-b border-admin-outline-variant/10 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1 rounded-full ${
                        feature.eligible ? 'bg-admin-success/15 text-admin-success' : 'bg-admin-error/15 text-admin-error'
                      }`}
                    >
                      {feature.eligible ? (
                        <IconCheck className="w-4 h-4" />
                      ) : (
                        <IconX className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm text-admin-on-surface">{feature.name}</span>
                  </div>
                  <span className="text-xs text-admin-on-surface-variant">{feature.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
        <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
          How It Works
        </h3>
        <div className="prose prose-sm prose-invert max-w-none">
          <ul className="text-sm text-admin-on-surface-variant space-y-2 list-disc list-inside">
            <li>Enter a user ID or email address to check their feature eligibility</li>
            <li>Admin capabilities are derived from user roles (isAdmin, adminRoles)</li>
            <li>Feature eligibility is determined by subscription tier and feature flags</li>
            <li>Super admins automatically have all capabilities when bypass is enabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
