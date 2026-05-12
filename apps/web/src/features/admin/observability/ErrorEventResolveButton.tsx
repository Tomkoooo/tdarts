'use client';

import React, { useTransition } from 'react';
import { useParams } from 'next/navigation';
import { adminResolveErrorEventAction } from '@/features/admin/observability/actions';

export function ErrorEventResolveButton({ eventId, isResolved }: { eventId: string; isResolved: boolean }) {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
      onClick={() =>
        start(async () => {
          await adminResolveErrorEventAction(locale, eventId, !isResolved);
          window.location.reload();
        })
      }
    >
      {isResolved ? 'Mark unresolved' : 'Mark resolved'}
    </button>
  );
}
