'use client';

import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from '@/features/admin/tables/AdminDataTable';

export type AdminLogRow = {
  id: string;
  level: string;
  category: string;
  message: string;
  timestamp: string;
  operation?: string;
};

type Props = {
  rows: AdminLogRow[];
};

export function AdminObservabilityLogsTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<AdminLogRow>[]>(
    () => [
      { id: 'ts', header: 'Time', accessorKey: 'timestamp' },
      { id: 'level', header: 'Level', accessorKey: 'level' },
      { id: 'category', header: 'Category', accessorKey: 'category' },
      { id: 'message', header: 'Message', accessorKey: 'message' },
      { id: 'op', header: 'Operation', accessorFn: (r) => r.operation || '—' },
    ],
    [],
  );

  return <AdminDataTable tableId="logs" columns={columns} data={rows} getRowId={(r) => r.id} />;
}
