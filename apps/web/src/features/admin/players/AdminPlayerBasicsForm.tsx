'use client';

import React, { useState, useTransition } from 'react';
import { adminUpdatePlayerBasicsAction } from '@/features/admin/players/actions';

type Props = {
  locale: string;
  playerId: string;
  name: string;
  country: string | null;
};

export function AdminPlayerBasicsForm({ locale, playerId, name, country }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-semibold">Basics</h2>
      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
      <form
        className="mt-3 space-y-2"
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const r = await adminUpdatePlayerBasicsAction(locale, playerId, fd);
            setMsg(r.ok ? 'Saved.' : r.error ?? 'Error');
          });
        }}
      >
        <label className="block text-sm">
          <span className="text-muted-foreground">Name</span>
          <input name="name" defaultValue={name} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Country (ISO or empty)</span>
          <input
            name="country"
            defaultValue={country ?? ''}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
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
