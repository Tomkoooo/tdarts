'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminSubscriptionRow } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { AdminServerDataTable } from '@/features/admin/list/AdminServerDataTable';
import { formatAdminDate } from '@/features/admin/list/format';
import type { AdminListParams } from '@/features/admin/lib/list-params';

const columns: ColumnDef<AdminSubscriptionRow, unknown>[] = [
  {
    id: 'user',
    header: 'Felhasználó',
    meta: { sortKey: 'user' },
    cell: ({ row }) => {
      const { userId, userEmail, missingUser } = row.original;
      if (!userId) return <span className="text-muted-foreground">—</span>;
      if (missingUser) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="destructive">Hiányzó user</Badge>
            <span className="font-mono text-xs">{userId}</span>
          </div>
        );
      }
      return (
        <AdminRelationLink
          href={`/admin/users/${userId}`}
          label={userEmail || userId}
          sublabel={userId}
        />
      );
    },
  },
  {
    id: 'club',
    header: 'Klub',
    meta: { sortKey: 'club' },
    cell: ({ row }) => {
      const { clubId, clubName, missingClub } = row.original;
      if (!clubId) return <span className="text-muted-foreground">—</span>;
      if (missingClub) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="destructive">Hiányzó klub</Badge>
            <span className="font-mono text-xs">{clubId}</span>
          </div>
        );
      }
      return (
        <AdminRelationLink href={`/admin/clubs/${clubId}`} label={clubName || clubId} sublabel={clubId} />
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Feliratkozás',
    meta: { sortKey: 'created' },
    cell: ({ row }) => formatAdminDate(row.original.createdAt),
  },
];

type Props = {
  rows: AdminSubscriptionRow[];
  total: number;
  params: AdminListParams;
};

export function SubscriptionsDirectoryTable({ rows, total, params }: Props) {
  return (
    <AdminServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      basePath="/admin/subscriptions"
      emptyLabel="Nincs klub-feliratkozás."
    />
  );
}
