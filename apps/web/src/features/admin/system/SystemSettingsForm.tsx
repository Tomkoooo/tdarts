'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import type { SystemSettingsSnapshot } from '@tdarts/core/system-settings';
import {
  adminUpdateFeatureToggleAction,
  adminUpdatePaywallAction,
  adminUpdateSuperAdminBypassAction,
} from '@/features/admin/system/actions';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/Label';

/** Mirror of `FEATURE_TOGGLE_KEYS` — keep in sync with `@tdarts/core` (avoid bundling full core in client). */
const FEATURE_TOGGLE_KEYS_UI = [
  'LEAGUES',
  'SOCKET',
  'LIVE_MATCH_FOLLOWING',
  'DETAILED_STATISTICS',
  'ADVANCED_STATISTICS',
  'OAC_CREATION',
  'ADS',
  'ADS_PLACEHOLDER',
] as const;

type Props = {
  initial: SystemSettingsSnapshot;
  readOnly?: boolean;
};

export function SystemSettingsForm({ initial, readOnly }: Props) {
  const locale = useLocale();
  const [snapshot, setSnapshot] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const keys = useMemo(() => [...FEATURE_TOGGLE_KEYS_UI], []);

  const run = async (
    fn: () => Promise<{
      ok: boolean;
      error?: string;
      snapshot?: SystemSettingsSnapshot;
    }>,
  ) => {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? 'Saved.' : res.error || 'Failed');
      if (res.ok && res.snapshot) {
        setSnapshot(res.snapshot as SystemSettingsSnapshot);
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {message ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            message === 'Saved.' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-destructive/40 bg-destructive/10'
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Feature toggles</h2>
        <p className="text-xs text-muted-foreground">
          Global runtime switches (DB-backed). Changes apply immediately for new requests.
        </p>
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key} className="flex items-center justify-between gap-4 border-b border-border/40 py-2 last:border-0">
              <Label htmlFor={`ft-${key}`} className="font-mono text-xs">
                {key}
              </Label>
              <Switch
                id={`ft-${key}`}
                checked={snapshot.features[key]}
                disabled={pending || readOnly}
                onCheckedChange={(checked) => {
                  if (readOnly) return;
                  setSnapshot((s) => ({
                    ...s,
                    features: { ...s.features, [key]: checked },
                  }));
                  void run(() =>
                    adminUpdateFeatureToggleAction(locale, key as (typeof FEATURE_TOGGLE_KEYS_UI)[number], checked),
                  );
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Subscription paywall</h2>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="paywall" className="text-sm">
            subscriptionPaywallEnabled
          </Label>
          <Switch
            id="paywall"
            checked={snapshot.subscriptionPaywallEnabled}
            disabled={pending || readOnly}
            onCheckedChange={(checked) => {
              if (readOnly) return;
              setSnapshot((s) => ({ ...s, subscriptionPaywallEnabled: checked }));
              void run(() => adminUpdatePaywallAction(locale, checked));
            }}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h2 className="text-sm font-semibold">Super-admin feature bypass</h2>
        <p className="text-xs text-muted-foreground">
          When off, global admins follow the same feature gate path as regular users (useful for debugging).
        </p>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="bypass" className="text-sm">
            superAdminBypassEnabled
          </Label>
          <Switch
            id="bypass"
            checked={snapshot.superAdminBypassEnabled}
            disabled={pending || readOnly}
            onCheckedChange={(checked) => {
              if (readOnly) return;
              setSnapshot((s) => ({ ...s, superAdminBypassEnabled: checked }));
              void run(() => adminUpdateSuperAdminBypassAction(locale, checked));
            }}
          />
        </div>
      </section>

      <div className="text-xs text-muted-foreground">
        Last updated: {snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleString() : '—'}
        {snapshot.updatedBy ? ` · by ${snapshot.updatedBy}` : ''}
      </div>
    </div>
  );
}
