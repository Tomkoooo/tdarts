'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { formatAdminDate } from '@/features/admin/list/format';
import {
  adminFeedbackMarkReadAction,
  adminFeedbackMessageAction,
  adminFeedbackStatusAction,
} from '@/features/admin/feedback/actions';
import { AdminFeedbackThread } from '@/features/admin/feedback/AdminFeedbackThread';
import { FeedbackDetailEdit } from '@/features/admin/feedback/FeedbackDetailEdit';
import type { AdminFeedbackThreadItem } from '@tdarts/services';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  feedback: Record<string, unknown>;
};

export function FeedbackDetailView({ locale, feedback }: Props) {
  const router = useRouter();
  const id = String(feedback._id);
  const title = String(feedback.title ?? 'Visszajelzés');
  const [status, setStatus] = useState(String(feedback.status ?? 'pending'));
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [pending, start] = useTransition();

  const thread = (Array.isArray(feedback.thread) ? feedback.thread : []) as AdminFeedbackThreadItem[];

  const refresh = () => router.refresh();

  return (
    <AdminDetailShell
      title={title}
      description={String(feedback.email ?? '')}
      backHref="/admin/support/feedback"
      backLabel="Vissza a listához"
      tabs={[
        {
          id: 'identity',
          label: 'Azonosítás',
          content: (
            <>
              <AdminFieldGrid>
                <AdminField label="Email">{String(feedback.email ?? '—')}</AdminField>
                <AdminField label="Kategória">{String(feedback.category ?? '—')}</AdminField>
                <AdminField label="Prioritás">
                  <Badge>{String(feedback.priority ?? '')}</Badge>
                </AdminField>
                <AdminField label="Státusz">{status}</AdminField>
                <AdminField label="Létrehozva">
                  {formatAdminDate(
                    feedback.createdAt instanceof Date
                      ? feedback.createdAt.toISOString()
                      : String(feedback.createdAt ?? ''),
                  )}
                </AdminField>
                <AdminField label="Request ID">
                  <span className="font-mono text-xs">{String(feedback.requestId ?? '—')}</span>
                </AdminField>
              </AdminFieldGrid>
              <FeedbackDetailEdit
                locale={locale}
                feedbackId={id}
                values={{
                  title: feedback.title ?? '',
                  category: feedback.category ?? 'other',
                  priority: feedback.priority ?? 'medium',
                  status: feedback.status ?? 'pending',
                  email: feedback.email ?? '',
                  description: feedback.description ?? '',
                }}
              />
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const r = await adminFeedbackMarkReadAction(locale, id, true);
                      if (r.ok) {
                        toast.success('Olvasottnak jelölve');
                        refresh();
                      } else toast.error(r.error ?? 'Hiba');
                    });
                  }}
                >
                  Olvasottnak jelöl
                </Button>
              </div>
            </>
          ),
        },
        {
          id: 'thread',
          label: 'Beszélgetés',
          content: (
            <AdminFeedbackThread
              feedbackId={id}
              locale={locale}
              meta={{
                title,
                status,
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
                  const r = await adminFeedbackMessageAction(locale, id, reply.trim(), internal);
                  if (r.ok) {
                    setReply('');
                    toast.success('Üzenet elküldve');
                    refresh();
                  } else toast.error(r.error ?? 'Hiba');
                });
              }}
              onStatusChange={(s) => {
                setStatus(s);
                start(async () => {
                  const r = await adminFeedbackStatusAction(
                    locale,
                    id,
                    s as 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed',
                  );
                  if (r.ok) {
                    toast.success('Státusz frissítve');
                    refresh();
                  } else toast.error(r.error ?? 'Hiba');
                });
              }}
            />
          ),
        },
        {
          id: 'audit',
          label: 'Audit',
          content: (
            <p className="text-muted-foreground text-sm">
              Státuszváltozások a beszélgetésben jelennek meg kiemelve.
            </p>
          ),
        },
      ]}
    />
  );
}
