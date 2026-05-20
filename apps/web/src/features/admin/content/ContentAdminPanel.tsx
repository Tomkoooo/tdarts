'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AnnouncementEditor } from '@/features/admin/content/AnnouncementEditor';
import { AnnouncementsDirectoryTable } from '@/features/admin/content/AnnouncementsDirectoryTable';
import type { AdminAnnouncementRow } from '@/features/admin/content/actions';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  rows: AdminAnnouncementRow[];
  total: number;
  params: AdminListParams;
  canWrite: boolean;
};

export function ContentAdminPanel({ rows, total, params, canWrite }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Mégse' : 'Új announcement'}
          </Button>
        </div>
      ) : null}
      {creating ? (
        <AnnouncementEditor
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      ) : null}
      <AnnouncementsDirectoryTable rows={rows} total={total} params={params} canWrite={canWrite} />
    </div>
  );
}
