'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import type { AdminUserListRow } from '@tdarts/services';
import { AdminEntitySheet } from '@/features/admin/components/AdminEntitySheet';
import { UserDetailTabs } from '@/features/admin/users/UserDetailTabs';
import { UsersDirectoryTable } from '@/features/admin/users/UsersDirectoryTable';
import { adminGetUserDetailAction } from '@/features/admin/users/actions';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  rows: AdminUserListRow[];
  total: number;
  params: AdminListParams;
};

export function UsersDirectoryWithSheet({ rows, total, params }: Props) {
  const routeParams = useParams();
  const locale = String(routeParams?.locale ?? 'hu');
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminGetUserDetailAction>> | null>(null);
  const [pending, start] = useTransition();

  const openUser = (id: string) => {
    setSelectedId(id);
    setOpen(true);
    start(async () => {
      const r = await adminGetUserDetailAction(id);
      setDetail(r);
    });
  };

  const user = detail?.ok ? detail.user : null;
  const title = user ? user.name || user.username || user.email : 'Felhasználó';

  return (
    <>
      <UsersDirectoryTable
        rows={rows}
        total={total}
        params={params}
        onRowClick={(row) => openUser(row._id)}
      />
      <AdminEntitySheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
        title={title}
        description={user?.email}
      >
        {pending && !user ? (
          <p className="text-muted-foreground text-sm">Betöltés…</p>
        ) : user && selectedId ? (
          <UserDetailTabs
            locale={locale}
            userId={selectedId}
            user={user}
            context={detail?.ok ? detail.context ?? null : null}
            auditLogs={detail?.ok ? detail.auditLogs : []}
            showFullPageLink
            onSaved={() => {
              if (selectedId) start(async () => setDetail(await adminGetUserDetailAction(selectedId)));
            }}
          />
        ) : detail && !detail.ok ? (
          <p className="text-destructive text-sm">{detail.error}</p>
        ) : null}
      </AdminEntitySheet>
    </>
  );
}
