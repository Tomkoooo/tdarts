'use client';

import { useState, useTransition, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  adminFeedbackMessageAction,
  adminGetFeedbackDetailAction,
  adminFeedbackStatusAction,
} from '@/features/admin/feedback/actions';
import { AdminFeedbackThread } from '@/features/admin/feedback/AdminFeedbackThread';
import type { AdminFeedbackThreadItem } from '@tdarts/services';
import toast from 'react-hot-toast';

type Props = {
  feedbackId: string;
  initial?: Awaited<ReturnType<typeof adminGetFeedbackDetailAction>>;
};

export function AdminFeedbackMessenger({ feedbackId, initial }: Props) {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [detail, setDetail] = useState(initial ?? null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [pending, start] = useTransition();

  const reload = () => {
    start(async () => {
      const r = await adminGetFeedbackDetailAction(feedbackId);
      setDetail(r);
    });
  };

  useEffect(() => {
    if (!initial) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  if (!detail?.ok) {
    return <p className="text-destructive text-sm">{detail?.error ?? 'Betöltés…'}</p>;
  }

  const { feedback } = detail;
  const thread = (Array.isArray(feedback.thread) ? feedback.thread : []) as AdminFeedbackThreadItem[];

  return (
    <AdminFeedbackThread
      feedbackId={feedbackId}
      locale={locale}
      compact
      meta={{
        title: String(feedback.title ?? ''),
        status: String(feedback.status ?? ''),
        priority: String(feedback.priority ?? ''),
        email: String(feedback.email ?? ''),
      }}
      thread={thread}
      reply={reply}
      onReplyChange={setReply}
      internal={internal}
      onInternalChange={setInternal}
      pending={pending}
      onSend={() => {
        start(async () => {
          const r = await adminFeedbackMessageAction(locale, feedbackId, reply.trim(), internal);
          if (r.ok) {
            setReply('');
            reload();
          } else toast.error(r.error ?? 'Hiba');
        });
      }}
      onStatusChange={(s) => {
        start(async () => {
          const r = await adminFeedbackStatusAction(
            locale,
            feedbackId,
            s as 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed',
          );
          if (r.ok) {
            toast.success('Státusz frissítve');
            reload();
          } else toast.error(r.error ?? 'Hiba');
        });
      }}
    />
  );
}
