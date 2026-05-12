'use client';

import React, { useState, useTransition } from 'react';
import { adminUpdateClubFlagsAction } from '@/features/admin/clubs/actions';

type Props = {
  locale: string;
  clubId: string;
  verified: boolean;
  isActive: boolean;
};

export function AdminClubFlagsForm({ locale, clubId, verified, isActive }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-semibold">Club flags</h2>
      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
      <form
        className="mt-3 space-y-2"
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const r = await adminUpdateClubFlagsAction(locale, clubId, fd);
            setMsg(r.ok ? 'Saved.' : r.error ?? 'Error');
          });
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="verified" defaultChecked={verified} className="rounded border-border" />
          Verified
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={isActive} className="rounded border-border" />
          Active
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </div>
  );
}
