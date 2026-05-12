'use client';

import React, { useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { adminResolveErrorEventAction } from '@/features/admin/observability/actions';

export type ErrorEventRow = {
  id: string;
  routeKey: string;
  method: string;
  status: number;
  occurredAt: string;
  requestId?: string;
  isResolved: boolean;
  requestBodyTruncated?: boolean;
  responseBodyTruncated?: boolean;
  errorMessage?: string;
  requestBody?: string;
  responseBody?: string;
};

export function AdminErrorEventsTable({ rows }: { rows: ErrorEventRow[] }) {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Telemetry retention: Mongo TTL index typically removes documents after 7 days. Request/response bodies may be truncated at ingest.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="border-b border-border/60 px-3 py-2">When</th>
              <th className="border-b border-border/60 px-3 py-2">Route</th>
              <th className="border-b border-border/60 px-3 py-2">Status</th>
              <th className="border-b border-border/60 px-3 py-2">requestId</th>
              <th className="border-b border-border/60 px-3 py-2">Resolved</th>
              <th className="border-b border-border/60 px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 odd:bg-background even:bg-muted/10">
                <td className="px-3 py-2 align-top text-xs text-muted-foreground">{new Date(r.occurredAt).toLocaleString()}</td>
                <td className="px-3 py-2 align-top font-mono text-xs">
                  {r.method} {r.routeKey}
                </td>
                <td className="px-3 py-2 align-top">{r.status}</td>
                <td className="px-3 py-2 align-top font-mono text-xs">{r.requestId ?? '—'}</td>
                <td className="px-3 py-2 align-top">{r.isResolved ? 'yes' : 'no'}</td>
                <td className="px-3 py-2 align-top space-x-2">
                  <Link className="text-xs text-primary underline" href={`/admin/observability/errors/${r.id}`}>
                    Raw
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    className="text-xs text-primary underline disabled:opacity-50"
                    onClick={() =>
                      start(async () => {
                        await adminResolveErrorEventAction(locale, r.id, !r.isResolved);
                        window.location.reload();
                      })
                    }
                  >
                    Toggle resolved
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No error events
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
