'use client';

import { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { formatAdminDate } from '@/features/admin/list/format';
import {
  getFeedbackPriorityBadgeVariant,
  getFeedbackStatusBadgeVariant,
} from '@/features/admin/lib/status-badges';
import type { AdminFeedbackThreadItem } from '@tdarts/services';
import { cn } from '@/lib/utils';

type FeedbackMeta = {
  title: string;
  status: string;
  priority: string;
  email: string;
};

type Props = {
  feedbackId: string;
  locale: string;
  meta: FeedbackMeta;
  thread: AdminFeedbackThreadItem[];
  reply: string;
  onReplyChange: (v: string) => void;
  internal: boolean;
  onInternalChange: (v: boolean) => void;
  pending?: boolean;
  onSend: () => void;
  onStatusChange?: (status: string) => void;
  statusOptions?: string[];
  compact?: boolean;
};

export function AdminFeedbackThread({
  meta,
  thread,
  reply,
  onReplyChange,
  internal,
  onInternalChange,
  pending,
  onSend,
  onStatusChange,
  statusOptions = ['pending', 'in-progress', 'resolved', 'rejected', 'closed'],
  compact,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  return (
    <div className={cn('flex flex-col', compact ? 'h-[min(70vh,640px)]' : 'min-h-[480px]')}>
      <div className="border-border flex flex-wrap items-center gap-2 border-b pb-3">
        <h3 className="font-medium">{meta.title}</h3>
        <Badge variant={getFeedbackStatusBadgeVariant(meta.status)}>{meta.status}</Badge>
        <Badge variant={getFeedbackPriorityBadgeVariant(meta.priority)}>{meta.priority}</Badge>
        <span className="text-muted-foreground ml-auto text-xs">{meta.email}</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {thread.map((item) => {
          if (item.role === 'system') {
            return (
              <div key={item.id} className="flex justify-center">
                <div className="flex max-w-[90%] flex-col items-center gap-1 text-center">
                  <Badge
                    variant={
                      item.statusKey
                        ? getFeedbackStatusBadgeVariant(item.statusKey)
                        : 'outline'
                    }
                    className="text-xs"
                  >
                    {item.content}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {formatAdminDate(item.createdAt)}
                  </span>
                </div>
              </div>
            );
          }

          const isStaff = item.role === 'staff';
          return (
            <div
              key={item.id}
              className={cn('flex gap-2', isStaff ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase',
                  isStaff && 'bg-primary text-primary-foreground',
                )}
              >
                {item.senderLabel.slice(0, 2)}
              </div>
              <div className={cn('max-w-[80%] space-y-0.5', isStaff ? 'items-end text-right' : '')}>
                <p className="text-muted-foreground text-[11px] font-medium">{item.senderLabel}</p>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2 text-sm',
                    item.isInternal
                      ? 'border border-dashed border-amber-500/50 bg-amber-500/10'
                      : isStaff
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                  )}
                >
                  {item.isInternal ? (
                    <span className="mb-1 block text-[10px] uppercase opacity-70">Belső</span>
                  ) : null}
                  <p className="whitespace-pre-wrap text-left">{item.content}</p>
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {formatAdminDate(item.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {onStatusChange ? (
        <div className="border-border flex flex-wrap gap-2 border-t pt-3">
          {statusOptions.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={meta.status === s ? 'default' : 'outline'}
              disabled={pending}
              onClick={() => onStatusChange(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="border-border space-y-2 border-t pt-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={internal}
            onChange={(e) => onInternalChange(e.target.checked)}
          />
          Belső megjegyzés
        </label>
        <Textarea
          value={reply}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder="Üzenet…"
          className="min-h-[80px]"
        />
        <Button type="button" disabled={pending || !reply.trim()} onClick={onSend}>
          Küldés
        </Button>
      </div>
    </div>
  );
}
