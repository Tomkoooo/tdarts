'use client';

import React, { useState, useTransition } from 'react';
import type { AdminUserListRow } from '@tdarts/services';
import { adminRevertUserAction, adminSetUserPasswordAction, adminUpdateUserAction } from '@/features/admin/users/actions';

type Props = {
  locale: string;
  user: AdminUserListRow & { locale?: string; country?: string | null };
  initialSnapshot: { isAdmin: boolean; isVerified: boolean; isDeleted: boolean; adminRoles: string[] };
  linkedPlayerId: string | null;
  subscriptionCount: number;
  managedClubsCount: number;
};

export function AdminUserDetailForms({
  locale,
  user,
  initialSnapshot,
  linkedPlayerId,
  subscriptionCount,
  managedClubsCount,
}: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [pwd, setPwd] = useState('');

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Related</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Linked player: {linkedPlayerId ? <span className="font-mono text-foreground">{linkedPlayerId}</span> : '—'}</li>
          <li>Subscriptions: {subscriptionCount}</li>
          <li>Managed clubs (admin/moderator): {managedClubsCount}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Roles & flags</h2>
        <form
          className="mt-3 space-y-3"
          action={(fd) => {
            setMsg(null);
            start(async () => {
              const r = await adminUpdateUserAction(locale, user._id, fd);
              setMsg(r.ok ? 'Saved.' : r.error ?? 'Error');
            });
          }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isAdmin" defaultChecked={user.isAdmin} className="rounded border-border" />
            Super-admin (isAdmin)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isVerified" defaultChecked={user.isVerified} className="rounded border-border" />
            Email verified
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDeleted" defaultChecked={user.isDeleted} className="rounded border-border" />
            Soft-deleted
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">adminRoles (comma-separated)</span>
            <input
              name="adminRoles"
              defaultValue={user.adminRoles.join(', ')}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save roles
          </button>
        </form>
        <button
          type="button"
          disabled={pending}
          className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
          onClick={() => {
            if (!window.confirm('Reset user flags to values from when this page was loaded?')) return;
            start(async () => {
              const r = await adminRevertUserAction(locale, user._id, JSON.stringify(initialSnapshot));
              setMsg(r.ok ? 'Reverted to loaded snapshot.' : r.error ?? 'Error');
            });
          }}
        >
          Reset to loaded snapshot
        </button>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Password</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sets a new bcrypt-hashed password. For OAuth-only accounts this also switches auth to local.
        </p>
        <div className="mt-3 flex max-w-md flex-wrap items-end gap-2">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="text-muted-foreground">New password (min 8)</span>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              autoComplete="new-password"
            />
          </label>
          <button
            type="button"
            disabled={pending || pwd.length < 8}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => {
              if (!window.confirm('Set this password for the user?')) return;
              setMsg(null);
              start(async () => {
                const r = await adminSetUserPasswordAction(locale, user._id, pwd);
                setMsg(r.ok ? 'Password updated.' : r.error ?? 'Error');
                if (r.ok) setPwd('');
              });
            }}
          >
            Set password
          </button>
        </div>
      </section>
    </div>
  );
}
