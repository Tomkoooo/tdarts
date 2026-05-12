'use client';

import React from 'react';

import type { AdminLogRow } from '@/features/admin/observability/AdminObservabilityLogsTable';

export function ObservabilityLogsExportButton({ rows }: { rows: AdminLogRow[] }) {
  return (
    <button
      type="button"
      className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium hover:bg-muted"
      onClick={() => {
        const header = ['timestamp', 'level', 'category', 'message', 'operation'].join(',');
        const lines = rows.map((r) =>
          [r.timestamp, r.level, r.category, JSON.stringify(r.message), JSON.stringify(r.operation || '')].join(','),
        );
        const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tdarts-logs-${new Date().toISOString().slice(0, 19)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export CSV ({rows.length})
    </button>
  );
}
