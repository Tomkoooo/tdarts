'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { IconDeviceFloppy } from '@tabler/icons-react';

const mockSettings = {
  superAdminBypassEnabled: true,
  maintenanceMode: false,
  registrationEnabled: true,
  maxTournamentsPerDay: 50,
  defaultLegsToWin: 3,
  paywallEnabled: true,
  freeTrialDays: 14,
};

export default function AdminSystemPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System Settings"
        description="Configure global system settings and feature flags"
        actions={
          <Button size="sm">
            <IconDeviceFloppy className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Control */}
        <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
          <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
            Access Control
          </h3>
          <div className="space-y-4">
            <SettingToggle
              label="Super Admin Bypass"
              description="Allow super admins to bypass feature gates and paywall"
              enabled={mockSettings.superAdminBypassEnabled}
            />
            <SettingToggle
              label="Maintenance Mode"
              description="Put the site in maintenance mode (only admins can access)"
              enabled={mockSettings.maintenanceMode}
              variant="warning"
            />
            <SettingToggle
              label="Registration Enabled"
              description="Allow new users to register on the platform"
              enabled={mockSettings.registrationEnabled}
            />
          </div>
        </div>

        {/* Subscription Settings */}
        <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
          <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
            Subscription & Paywall
          </h3>
          <div className="space-y-4">
            <SettingToggle
              label="Paywall Enabled"
              description="Require subscription for premium features"
              enabled={mockSettings.paywallEnabled}
            />
            <SettingNumber
              label="Free Trial Days"
              description="Number of days for free trial"
              value={mockSettings.freeTrialDays}
            />
          </div>
        </div>

        {/* Tournament Settings */}
        <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
          <h3 className="text-sm font-medium text-admin-on-surface-variant uppercase tracking-wider mb-4">
            Tournament Defaults
          </h3>
          <div className="space-y-4">
            <SettingNumber
              label="Max Tournaments per Day"
              description="Maximum tournaments a club can create per day"
              value={mockSettings.maxTournamentsPerDay}
            />
            <SettingNumber
              label="Default Legs to Win"
              description="Default legs required to win a match"
              value={mockSettings.defaultLegsToWin}
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl bg-admin-surface-container border border-admin-error/30 p-6">
          <h3 className="text-sm font-medium text-admin-error uppercase tracking-wider mb-4">
            Danger Zone
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-admin-on-surface">Clear Cache</p>
                <p className="text-xs text-admin-on-surface-variant mt-0.5">
                  Clear all cached data across the platform
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-admin-error/50 text-admin-error hover:bg-admin-error/10">
                Clear
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-admin-on-surface">Reset Feature Flags</p>
                <p className="text-xs text-admin-on-surface-variant mt-0.5">
                  Reset all feature flags to default values
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-admin-error/50 text-admin-error hover:bg-admin-error/10">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  enabled,
  variant = 'default',
}: {
  label: string;
  description: string;
  enabled: boolean;
  variant?: 'default' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-admin-on-surface">{label}</p>
        <p className="text-xs text-admin-on-surface-variant mt-0.5">{description}</p>
      </div>
      <button
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled
            ? variant === 'warning'
              ? 'bg-admin-warning'
              : 'bg-admin-success'
            : 'bg-admin-surface-elevated'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SettingNumber({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-admin-on-surface">{label}</p>
        <p className="text-xs text-admin-on-surface-variant mt-0.5">{description}</p>
      </div>
      <input
        type="number"
        defaultValue={value}
        className="w-20 px-3 py-1.5 rounded-md bg-admin-surface-elevated border border-admin-outline-variant/30 text-admin-on-surface text-sm text-right admin-text-mono-data focus:outline-none focus:ring-2 focus:ring-admin-primary/50"
      />
    </div>
  );
}
