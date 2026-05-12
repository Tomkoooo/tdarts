'use client';

import React, { useTransition } from 'react';
import { useParams } from 'next/navigation';
import { adminRevertMatchOverrideAction } from '@/features/admin/matches/actions';

export function MatchRevertButton({ matchId }: { matchId: string }) {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 disabled:opacity-50"
      onClick={() => {
        if (!window.confirm('Revert manual override using stored previousState?')) return;
        start(async () => {
          const r = await adminRevertMatchOverrideAction(locale, matchId);
          if (!r.ok) window.alert(r.error ?? 'Failed');
          else window.location.reload();
        });
      }}
    >
      Revert manual override
    </button>
  );
}
