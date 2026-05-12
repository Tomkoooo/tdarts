'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/features/admin/tables/AdminDataTable';

export type ApiMetricRow = {
  id: string;
  bucket: string;
  routeKey: string;
  method: string;
  count: number;
  errorCount: number;
  timeoutCount: number;
  avgMs: number;
};

type Props = {
  rows: ApiMetricRow[];
};

export function AdminApiMetricsTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<ApiMetricRow>[]>(
    () => [
      { id: 'bucket', header: 'Bucket', accessorKey: 'bucket' },
      { id: 'route', header: 'Route', accessorKey: 'routeKey' },
      { id: 'method', header: 'Method', accessorKey: 'method' },
      { id: 'count', header: 'Count', accessorKey: 'count' },
      { id: 'errors', header: 'Errors', accessorKey: 'errorCount' },
      { id: 'timeouts', header: 'Timeouts', accessorKey: 'timeoutCount' },
      { id: 'avgMs', header: 'Avg ms', accessorKey: 'avgMs' },
    ],
    [],
  );

  return <AdminDataTable tableId="api-metrics" columns={columns} data={rows} getRowId={(r) => r.id} />;
}
