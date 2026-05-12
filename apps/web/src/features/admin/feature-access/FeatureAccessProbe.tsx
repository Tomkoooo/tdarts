'use client';

import React, { useState, useTransition } from 'react';
import { adminProbeFeatureAccessAction } from '@/features/admin/feature-access/actions';

export function FeatureAccessProbe() {
  const [feature, setFeature] = useState('LEAGUES');
  const [clubId, setClubId] = useState('');
  const [out, setOut] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-sm text-muted-foreground">
        Evaluates feature access for the <strong>current signed-in</strong> user (same order as product gates).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Feature key</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Club id (optional)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            placeholder="Mongo ObjectId"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        onClick={() => {
          setOut(null);
          start(async () => {
            const res = await adminProbeFeatureAccessAction(feature, clubId || undefined);
            setOut(JSON.stringify(res, null, 2));
          });
        }}
      >
        Evaluate
      </button>
      {out ? (
        <pre className="max-h-96 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3 text-xs">{out}</pre>
      ) : null}
    </div>
  );
}
