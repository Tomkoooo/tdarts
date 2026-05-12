'use client';

import React, { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import {
  adminFeedbackMarkReadAction,
  adminFeedbackMessageAction,
  adminFeedbackStatusAction,
} from '@/features/admin/feedback/actions';

type Props = {
  feedbackId: string;
  initialStatus: string;
  initialRead: boolean;
};

export function AdminFeedbackDetailPanel({ feedbackId, initialStatus, initialRead }: Props) {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState('');

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <h2 className="text-sm font-semibold">Ticket actions</h2>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label>
          Status{' '}
          <select
            defaultValue={initialStatus}
            className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
            onChange={(e) => {
              const v = e.target.value as 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed';
              setMsg(null);
              start(async () => {
                const r = await adminFeedbackStatusAction(locale, feedbackId, v);
                setMsg(r.ok ? 'Status updated.' : r.error ?? 'Error');
              });
            }}
          >
            <option value="pending">pending</option>
            <option value="in-progress">in-progress</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await adminFeedbackMarkReadAction(locale, feedbackId, !initialRead);
              setMsg(r.ok ? 'Read flag toggled (refresh for label).' : r.error ?? 'Error');
            });
          }}
        >
          Toggle admin read
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Reply to user</span>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            rows={3}
          />
        </label>
        <button
          type="button"
          disabled={pending || !reply.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() => {
            setMsg(null);
            start(async () => {
              const r = await adminFeedbackMessageAction(locale, feedbackId, reply, false);
              setMsg(r.ok ? 'Message added.' : r.error ?? 'Error');
              if (r.ok) setReply('');
            });
          }}
        >
          Send reply
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Internal note</span>
          <textarea
            value={internal}
            onChange={(e) => setInternal(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            rows={2}
          />
        </label>
        <button
          type="button"
          disabled={pending || !internal.trim()}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
          onClick={() => {
            setMsg(null);
            start(async () => {
              const r = await adminFeedbackMessageAction(locale, feedbackId, internal, true);
              setMsg(r.ok ? 'Internal note added.' : r.error ?? 'Error');
              if (r.ok) setInternal('');
            });
          }}
        >
          Add internal note
        </button>
      </div>
    </div>
  );
}
