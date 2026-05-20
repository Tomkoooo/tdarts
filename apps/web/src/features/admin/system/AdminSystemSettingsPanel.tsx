'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { AdminSection } from '@/features/admin/components/AdminSection';
import {
  adminUpdateFeatureToggleAction,
  adminUpdatePaywallAction,
  adminUpdateSuperAdminBypassAction,
} from '@/features/admin/system/actions';
import type { AdminSystemSettingsView } from '@/features/admin/system/types';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  canWrite: boolean;
  toggleKeys: (keyof AdminSystemSettingsView['features'])[];
  initial: AdminSystemSettingsView;
};

export function AdminSystemSettingsPanel({ locale, canWrite, toggleKeys, initial }: Props) {
  const t = useTranslations('Admin.system');
  const [snapshot, setSnapshot] = useState(initial);
  const [pending, start] = useTransition();

  const updatedLabel = new Intl.DateTimeFormat('hu-HU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(snapshot.updatedAt));

  function applySnapshot(next: AdminSystemSettingsView) {
    setSnapshot(next);
  }

  function toView(
    raw: NonNullable<Awaited<ReturnType<typeof adminUpdateFeatureToggleAction>>['snapshot']>,
  ): AdminSystemSettingsView {
    return {
      features: raw.features,
      subscriptionPaywallEnabled: raw.subscriptionPaywallEnabled,
      superAdminBypassEnabled: raw.superAdminBypassEnabled,
      updatedAt: raw.updatedAt.toISOString(),
      updatedBy: raw.updatedBy,
    };
  }

  return (
    <div className="space-y-6">
      {!canWrite ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-3 text-sm">
          {t('read_only')}
        </p>
      ) : null}

      <AdminSection title={t('features_title')} description={t('features_description')}>
        <ul className="divide-y divide-border">
          {toggleKeys.map((key) => (
            <li key={key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 space-y-1">
                <Label htmlFor={`toggle-${key}`} className="text-sm font-medium">
                  {t(`toggles.${key}.label`)}
                </Label>
                <p className="text-muted-foreground text-xs">{t(`toggles.${key}.hint`)}</p>
              </div>
              <Switch
                id={`toggle-${key}`}
                checked={snapshot.features[key]}
                disabled={!canWrite || pending}
                onCheckedChange={(checked) => {
                  start(async () => {
                    const r = await adminUpdateFeatureToggleAction(locale, key, checked);
                    if (r.ok && r.snapshot) {
                      applySnapshot(toView(r.snapshot));
                      toast.success(t('save_ok'));
                    } else {
                      toast.error(r.error ?? t('save_error'));
                    }
                  });
                }}
              />
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection title={t('paywall_title')} description={t('paywall_description')}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="paywall" className="text-sm font-medium">
              {t('paywall_label')}
            </Label>
            {snapshot.subscriptionPaywallEnabled ? (
              <Badge variant="secondary">{t('paywall_on')}</Badge>
            ) : (
              <Badge variant="outline">{t('paywall_off')}</Badge>
            )}
          </div>
          <Switch
            id="paywall"
            checked={snapshot.subscriptionPaywallEnabled}
            disabled={!canWrite || pending}
            onCheckedChange={(checked) => {
              start(async () => {
                const r = await adminUpdatePaywallAction(locale, checked);
                if (r.ok && r.snapshot) {
                  applySnapshot(toView(r.snapshot));
                  toast.success(t('save_ok'));
                } else {
                  toast.error(r.error ?? t('save_error'));
                }
              });
            }}
          />
        </div>
      </AdminSection>

      <AdminSection title={t('bypass_title')} description={t('bypass_description')}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="bypass" className="text-sm font-medium">
              {t('bypass_label')}
            </Label>
            <p className="text-muted-foreground text-xs">{t('bypass_hint')}</p>
          </div>
          <Switch
            id="bypass"
            checked={snapshot.superAdminBypassEnabled}
            disabled={!canWrite || pending}
            onCheckedChange={(checked) => {
              start(async () => {
                const r = await adminUpdateSuperAdminBypassAction(locale, checked);
                if (r.ok && r.snapshot) {
                  applySnapshot(toView(r.snapshot));
                  toast.success(t('save_ok'));
                } else {
                  toast.error(r.error ?? t('save_error'));
                }
              });
            }}
          />
        </div>
      </AdminSection>

      <p className="text-muted-foreground text-xs">
        {t('updated', { date: updatedLabel })}
        {snapshot.updatedBy ? (
          <>
            {' · '}
            {t('updated_by', { id: snapshot.updatedBy })}
          </>
        ) : null}
      </p>
    </div>
  );
}
