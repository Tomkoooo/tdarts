'use client';

import { useState } from 'react';
import type { AdminFeedbackListRow } from '@tdarts/services';
import { AdminEntitySheet } from '@/features/admin/components/AdminEntitySheet';
import { AdminFeedbackMessenger } from '@/features/admin/feedback/AdminFeedbackMessenger';
import { FeedbackDirectoryTable } from '@/features/admin/feedback/FeedbackDirectoryTable';
import type { AdminFeedbackListParams } from '@/features/admin/feedback/actions';

type Props = {
  rows: AdminFeedbackListRow[];
  total: number;
  params: AdminFeedbackListParams;
  extraQuery?: Record<string, string | undefined>;
};

export function FeedbackInboxWithSheet({ rows, total, params, extraQuery }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <FeedbackDirectoryTable
        rows={rows}
        total={total}
        params={params}
        extraQuery={extraQuery}
        onRowClick={(row) => {
          setSelectedId(row._id);
          setOpen(true);
        }}
      />
      <AdminEntitySheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSelectedId(null);
        }}
        title="Visszajelzés"
      >
        {selectedId ? <AdminFeedbackMessenger feedbackId={selectedId} /> : null}
      </AdminEntitySheet>
    </>
  );
}
