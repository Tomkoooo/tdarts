'use client';

import React, { useState, useTransition } from 'react';
import { adminRotateTournamentPasswordAction, adminUpdateTournamentFlagsAction } from '@/features/admin/tournaments/actions';

type Props = {
  locale: string;
  mongoId: string;
  flags: { isArchived: boolean; isSandbox: boolean; isDeleted: boolean; verified: boolean };
};

export function AdminTournamentAdminPanel({ locale, mongoId, flags }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState<string | null>(null);

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-semibold">Admin operations</h2>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {newPwd ? (
        <p className="rounded-md bg-amber-500/10 p-2 font-mono text-xs text-amber-200">
          New tournament password (copy now): {newPwd}
        </p>
      ) : null}

      <form
        className="space-y-2"
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const r = await adminUpdateTournamentFlagsAction(locale, mongoId, fd);
            setMsg(r.ok ? 'Flags saved.' : r.error ?? 'Error');
          });
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isArchived" defaultChecked={flags.isArchived} className="rounded border-border" />
          Archived
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isSandbox" defaultChecked={flags.isSandbox} className="rounded border-border" />
          Sandbox
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDeleted" defaultChecked={flags.isDeleted} className="rounded border-border" />
          Deleted
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="verified" defaultChecked={flags.verified} className="rounded border-border" />
          Verified
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Save flags
        </button>
      </form>

      <button
        type="button"
        disabled={pending}
        className="text-sm text-primary underline disabled:opacity-50"
        onClick={() => {
          if (!window.confirm('Generate a new tournament join password?')) return;
          setMsg(null);
          setNewPwd(null);
          start(async () => {
            const r = await adminRotateTournamentPasswordAction(locale, mongoId);
            if (r.ok && r.newPassword) {
              setNewPwd(r.newPassword);
              setMsg('Password rotated.');
            } else setMsg(r.error ?? 'Error');
          });
        }}
      >
        Rotate join password
      </button>
    </div>
  );
}
