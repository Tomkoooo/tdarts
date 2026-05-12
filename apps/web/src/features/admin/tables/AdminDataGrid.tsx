'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import * as Popover from '@radix-ui/react-popover';
import { IconColumns, IconDownload, IconTableExport, IconUpload } from '@tabler/icons-react';

const columnStorageKey = (tableId: string) => `tdarts.admin.table.columns.${tableId}`;
const viewsStorageKey = (tableId: string) => `tdarts.admin.table.savedViews.${tableId}`;

export type SavedTableView = {
  id: string;
  name: string;
  columnVisibility: VisibilityState;
};

export type AdminDataGridProps<T> = {
  tableId: string;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  /** When true, first column is selection checkboxes + bulk toolbar. */
  enableBulkSelect?: boolean;
  /** Rendered when at least one row selected (e.g. bulk delete button). */
  bulkActions?: (ctx: { selectedIds: string[]; clearSelection: () => void }) => React.ReactNode;
};

function loadViews(tableId: string): SavedTableView[] {
  try {
    const raw = localStorage.getItem(viewsStorageKey(tableId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTableView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveViews(tableId: string, views: SavedTableView[]) {
  try {
    localStorage.setItem(viewsStorageKey(tableId), JSON.stringify(views));
  } catch {
    /* ignore */
  }
}

export function AdminDataGrid<T>({
  tableId,
  columns,
  data,
  getRowId,
  enableBulkSelect,
  bulkActions,
}: AdminDataGridProps<T>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [savedViews, setSavedViews] = useState<SavedTableView[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectionColumn = useMemo<ColumnDef<T, unknown> | null>(() => {
    if (!enableBulkSelect) return null;
    return {
      id: '__select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-border"
          aria-label="Select all"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-border"
          aria-label="Select row"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    };
  }, [enableBulkSelect]);

  const tableColumns = useMemo(() => {
    if (selectionColumn) return [selectionColumn, ...columns];
    return columns;
  }, [selectionColumn, columns]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(columnStorageKey(tableId));
      if (raw) setColumnVisibility(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setSavedViews(loadViews(tableId));
  }, [tableId]);

  useEffect(() => {
    try {
      localStorage.setItem(columnStorageKey(tableId), JSON.stringify(columnVisibility));
    } catch {
      /* ignore */
    }
  }, [tableId, columnVisibility]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { columnVisibility, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: Boolean(enableBulkSelect),
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId ? { getRowId: (row: T, index: number) => getRowId(row, index) } : {}),
  });

  const toggleable = useMemo(() => table.getAllLeafColumns().filter((c) => c.getCanHide()), [table]);

  const selectedIds = useMemo(() => {
    return table.getSelectedRowModel().flatRows.map((r) => r.id);
  }, [table, rowSelection]);

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const persistNewView = useCallback(() => {
    const name = window.prompt('View name');
    if (!name?.trim()) return;
    const id = `${Date.now()}`;
    const next: SavedTableView[] = [...savedViews, { id, name: name.trim(), columnVisibility: { ...columnVisibility } }];
    setSavedViews(next);
    saveViews(tableId, next);
  }, [columnVisibility, savedViews, tableId]);

  const applyView = useCallback(
    (v: SavedTableView) => {
      setColumnVisibility({ ...v.columnVisibility });
    },
    [setColumnVisibility],
  );

  const exportLayoutJson = useCallback(() => {
    const payload = {
      version: 1,
      tableId,
      columnVisibility,
      savedViews,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-table-${tableId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [columnVisibility, savedViews, tableId]);

  const importLayoutJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || '');
          const parsed = JSON.parse(text) as {
            tableId?: string;
            columnVisibility?: VisibilityState;
            savedViews?: SavedTableView[];
          };
          if (parsed.tableId && parsed.tableId !== tableId) {
            window.alert(`This file is for table "${parsed.tableId}", not "${tableId}".`);
            return;
          }
          if (parsed.columnVisibility && typeof parsed.columnVisibility === 'object') {
            setColumnVisibility(parsed.columnVisibility);
          }
          if (Array.isArray(parsed.savedViews)) {
            setSavedViews(parsed.savedViews);
            saveViews(tableId, parsed.savedViews);
          }
        } catch {
          window.alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    },
    [tableId],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50"
            >
              <IconColumns className="h-3.5 w-3.5" aria-hidden />
              Columns
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-56 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none"
              sideOffset={6}
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Visible</div>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {toggleable.map((column) => (
                  <li key={column.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                      />
                      <span className="truncate">
                        {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50"
          onClick={persistNewView}
        >
          Save view
        </button>

        {savedViews.length > 0 ? (
          <select
            className="max-w-[10rem] rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
            aria-label="Load saved view"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              const v = savedViews.find((x) => x.id === id);
              if (v) applyView(v);
              e.target.value = '';
            }}
          >
            <option value="">Load view…</option>
            {savedViews.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50"
          onClick={exportLayoutJson}
        >
          <IconDownload className="h-3.5 w-3.5" aria-hidden />
          Export JSON
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload className="h-3.5 w-3.5" aria-hidden />
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importLayoutJson(f);
            e.target.value = '';
          }}
        />

        {enableBulkSelect && selectedIds.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            <IconTableExport className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {selectedIds.length} selected
          </span>
        ) : null}
      </div>

      {enableBulkSelect && selectedIds.length > 0 && bulkActions ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          {bulkActions({ selectedIds, clearSelection })}
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
                <td colSpan={tableColumns.length} className="px-3 py-8 text-center text-muted-foreground">
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
