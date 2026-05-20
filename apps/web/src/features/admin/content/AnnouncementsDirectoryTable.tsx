'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminListParams } from '@/features/admin/lib/list-params';
import {
  adminToggleAnnouncementAction,
  type AdminAnnouncementRow,
} from '@/features/admin/content/actions';
import toast from 'react-hot-toast';

function typeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (type === 'error') return 'destructive';
  if (type === 'warning') return 'secondary';
  return 'outline';
}

function buildColumns(
  canWrite: boolean,
  locale: string,
  onToggled: () => void,
): ColumnDef<AdminAnnouncementRow, unknown>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Cím',
      meta: { sortKey: 'title' },
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Típus',
      cell: ({ row }) => (
        <Badge variant={typeVariant(row.original.type)}>{row.original.type}</Badge>
      ),
    },
    {
      id: 'status',
      header: 'Állapot',
      cell: ({ row }) => {
        const expired = new Date(row.original.expiresAt).getTime() <= Date.now();
        if (expired) return <Badge variant="destructive">Lejárt</Badge>;
        return row.original.isActive ? (
          <Badge variant="success">Aktív</Badge>
        ) : (
          <Badge variant="secondary">Inaktív</Badge>
        );
      },
    },
    {
      accessorKey: 'expiresAt',
      header: 'Lejárat',
      meta: { sortKey: 'expires' },
      cell: ({ row }) => formatAdminDate(row.original.expiresAt),
    },
    {
      accessorKey: 'createdAt',
      header: 'Létrehozva',
      cell: ({ row }) => formatAdminDate(row.original.createdAt),
    },
    ...(canWrite
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: AdminAnnouncementRow } }) => (
              <ToggleButton
                locale={locale}
                row={row.original}
                onDone={onToggled}
              />
            ),
          } as ColumnDef<AdminAnnouncementRow, unknown>,
        ]
      : []),
  ];
}

function ToggleButton({
  locale,
  row,
  onDone,
}: {
  locale: string;
  row: AdminAnnouncementRow;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const r = await adminToggleAnnouncementAction(locale, row._id);
          if (r.ok) {
            toast.success('Állapot frissítve');
            onDone();
          } else {
            toast.error(r.error ?? 'Hiba');
          }
        });
      }}
    >
      {pending ? '…' : row.isActive ? 'Kikapcsolás' : 'Bekapcsolás'}
    </Button>
  );
}

type Props = {
  rows: AdminAnnouncementRow[];
  total: number;
  params: AdminListParams;
  canWrite: boolean;
};

export function AnnouncementsDirectoryTable({ rows, total, params, canWrite }: Props) {
  const routeParams = useParams();
  const router = useRouter();
  const locale = String(routeParams?.locale ?? 'hu');

  const columns = buildColumns(canWrite, locale, () => {
    router.refresh();
  });

  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/content"
      emptyLabel="Nincs announcement."
    />
  );
}
