'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

const storageKey = (tableId: string) => `tdarts.admin.table.columns.${tableId}`;

type AdminDataTableProps<T> = {
  tableId: string;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
};

export function AdminDataTable<T>({ tableId, columns, data, getRowId }: AdminDataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(tableId));
      if (raw) setColumnVisibility(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [tableId]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(tableId), JSON.stringify(columnVisibility));
    } catch {
      /* ignore */
    }
  }, [tableId, columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId ? { getRowId: (row: T, index: number) => getRowId(row, index) } : {}),
  });

  const toggleable = useMemo(() => table.getAllLeafColumns().filter((c) => c.getCanHide()), [table]);

  return (
    <div className="space-y-3">
      {toggleable.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Columns:</span>
          {toggleable.map((column) => (
            <label key={column.id} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={column.getIsVisible()}
                onChange={column.getToggleVisibilityHandler()}
              />
              {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
            </label>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="border-b border-border/60 px-3 py-2 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  No rows
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/40 odd:bg-background even:bg-muted/10">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
