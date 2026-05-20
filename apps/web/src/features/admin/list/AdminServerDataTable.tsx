'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from '@/i18n/routing';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';
import { cn } from '@/lib/utils';

export type AdminColumnMeta = {
  sortKey?: string;
};

type Props<TData> = {
  columns: ColumnDef<TData, unknown>[];
  rows: TData[];
  total: number;
  params: AdminListParams;
  basePath: string;
  emptyLabel: string;
  onRowHref?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  extraQuery?: Record<string, string | undefined>;
};

export function AdminServerDataTable<TData>({
  columns,
  rows,
  total,
  params,
  basePath,
  emptyLabel,
  onRowHref,
  onRowClick,
  extraQuery,
}: Props<TData>) {
  const pageCount = Math.max(1, Math.ceil(total / params.limit));
  const pageIndex = params.page - 1;

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  const qs = (patch: Partial<AdminListParams>) =>
    buildListQueryString(params, { ...extraQuery, ...patch });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as AdminColumnMeta | undefined;
                  const sortKey = meta?.sortKey;
                  const isSorted = sortKey && params.sort === sortKey;
                  const nextDir =
                    isSorted && params.dir === 'asc' ? 'desc' : 'asc';

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : sortKey ? (
                        <Link
                          href={`${basePath}${qs({
                            sort: sortKey,
                            dir: nextDir,
                            page: 1,
                          })}`}
                          className="hover:text-foreground flex items-center gap-1 font-medium"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSorted ? (
                            <span className="text-muted-foreground text-xs">
                              {params.dir === 'asc' ? '↑' : '↓'}
                            </span>
                          ) : null}
                        </Link>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const href = onRowHref?.(row.original);
                const clickable = Boolean(href || onRowClick);
                return (
                  <TableRow
                    key={row.id}
                    className={cn(clickable && 'hover:bg-muted/50 cursor-pointer')}
                    onClick={
                      onRowClick
                        ? () => onRowClick(row.original)
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {href ? (
                          <Link href={href} className="block w-full">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Link>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {total.toLocaleString('hu-HU')} találat · {params.page}. / {pageCount} oldal
        </p>
        <div className="flex items-center gap-2">
          {pageIndex > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}${qs({ page: params.page - 1 })}`}>
                <IconChevronLeft className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <IconChevronLeft className="size-4" />
            </Button>
          )}
          {params.page < pageCount ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}${qs({ page: params.page + 1 })}`}>
                <IconChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <IconChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
