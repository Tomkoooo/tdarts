"use client"

import React from 'react';
import toast from 'react-hot-toast';
import { Send, User as UserIcon, Shield, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useUserContext } from '@/hooks/useUser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { adminFeedbackActions } from '@/features/admin/actions/adminDomains.action';
import { getFeedbackReadReceipt } from '@/lib/feedback-read-status';

interface Message {
  _id?: string;
  sender?: any;
  content: string;
  createdAt: Date | string;
  isInternal?: boolean;
}

interface Ticket {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  messages: Message[];
  userId?: any;
  email: string;
  isReadByUser: boolean;
  isReadByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminTicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onUpdate?: () => void;
}

function statusTranslationKey(status: Ticket['status']): string {
  if (status === 'in-progress') return 'status_in_progress';
  return `status_${status}` as string;
}

export default function AdminTicketDetail({ ticket: initialTicket, onBack, onUpdate }: AdminTicketDetailProps) {
  const { user } = useUserContext();
  const locale = useLocale();
  const t = useTranslations('Admin.dashboard.tickets.detail');
  const tToasts = useTranslations('Admin.dashboard.tickets.toasts');
  const [ticket, setTicket] = React.useState(initialTicket);
  const [replyContent, setReplyContent] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [status, setStatus] = React.useState(ticket.status);
  const [priority, setPriority] = React.useState(ticket.priority);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const markedReadTicketRef = React.useRef<string | null>(null);

  const readReceipt = React.useMemo(
    () =>
      getFeedbackReadReceipt(ticket.messages, ticket.userId, ticket.isReadByUser, ticket.isReadByAdmin),
    [ticket.messages, ticket.userId, ticket.isReadByUser, ticket.isReadByAdmin]
  );

  const readReceiptText = React.useMemo(() => {
    if (!readReceipt) return null;
    if (readReceipt.kind === 'user_message_pending_admin') {
      return readReceipt.seenByOther
        ? t('read_admin_user_sent_you_seen')
        : t('read_admin_user_sent_you_unseen');
    }
    return readReceipt.seenByOther
      ? t('read_admin_you_sent_user_seen')
      : t('read_admin_you_sent_user_unseen');
  }, [readReceipt, t]);

  React.useEffect(() => {
    setTicket(initialTicket);
    setStatus(initialTicket.status);
    setPriority(initialTicket.priority);
    markedReadTicketRef.current = null;
  }, [initialTicket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [ticket.messages]);

  React.useEffect(() => {
    const markAsRead = async () => {
      if (!ticket.isReadByAdmin && markedReadTicketRef.current !== ticket._id) {
        try {
          markedReadTicketRef.current = ticket._id;
          await adminFeedbackActions.markRead(ticket._id);
          setTicket((prev) => ({ ...prev, isReadByAdmin: true }));
          onUpdate?.();
        } catch (error) {
          markedReadTicketRef.current = null;
          console.error('Error marking ticket as read:', error);
        }
      }
    };
    markAsRead();
  }, [ticket._id, ticket.isReadByAdmin, onUpdate]);

  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onBack]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      toast.error(tToasts('empty_message'));
      return;
    }

    setIsSending(true);
    try {
      const response = await adminFeedbackActions.reply(ticket._id, replyContent.trim());

      if (response.data?.success) {
        setReplyContent('');
        toast.success(tToasts('reply_success'));
        onUpdate?.();
        onBack();
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error(error?.message || tToasts('reply_error'));
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async () => {
    if (status === ticket.status && priority === ticket.priority) {
      toast.error(tToasts('no_change'));
      return;
    }

    try {
      await adminFeedbackActions.update(ticket._id, { status, priority, emailNotification: 'status' });

      toast.success(tToasts('status_updated'));
      const response = await adminFeedbackActions.getById(ticket._id);
      if (response.data?.success) {
        setTicket(response.data.feedback);
      }
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(tToasts('status_error'));
    }
  };

  const isOwnMessage = (message: Message) => {
    if (!message.sender) return false;
    if (typeof message.sender === 'string') {
      return message.sender === user?._id;
    }
    return message.sender._id === user?._id;
  };

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[s] || colors.pending;
  };

  const dateLocale = locale === 'hu' ? 'hu-HU' : locale === 'de' ? 'de-DE' : 'en-US';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onBack();
      }}
    >
      <div
        className="bg-card border border-white/10 rounded-lg w-full max-w-4xl h-[85vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{ticket.title}</h3>
              <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{ticket.email}</span>
                  <span>•</span>
                  <span>#{ticket._id.slice(-6)}</span>
                </div>
                {readReceiptText && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/5 mt-1">
                    <span className="font-medium text-foreground/80">{t('read_receipt_label')}: </span>
                    {readReceiptText}
                  </p>
                )}
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs rounded-full border shrink-0 ${getStatusColor(ticket.status)}`}>
            {t(statusTranslationKey(ticket.status) as 'status_pending')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((message, index) => {
              if (!message.sender) {
                return (
                  <div key={index} className="flex justify-center">
                    <div className="bg-white/5 px-4 py-2 rounded-full text-xs text-gray-400 border border-white/10">
                      {message.content}
                    </div>
                  </div>
                );
              }

              const isOwn = isOwnMessage(message);
              const senderName = message.sender?.name || t('system_sender');
              const isAdmin = message.sender?.isAdmin;

              return (
                <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {isAdmin && <Shield className="w-3 h-3 text-accent" />}
                      {!isOwn && <UserIcon className="w-3 h-3" />}
                      <span>{senderName}</span>
                      <span>•</span>
                      <span>{new Date(message.createdAt).toLocaleString(dateLocale)}</span>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwn ? 'bg-accent text-white' : 'bg-white/10 text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-400 py-8">{t('no_messages')}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/10 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{t('status')}</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('status_pending')}</SelectItem>
                  <SelectItem value="in-progress">{t('status_in_progress')}</SelectItem>
                  <SelectItem value="resolved">{t('status_resolved')}</SelectItem>
                  <SelectItem value="rejected">{t('status_rejected')}</SelectItem>
                  <SelectItem value="closed">{t('status_closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t('priority')}</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('priority_low')}</SelectItem>
                  <SelectItem value="medium">{t('priority_medium')}</SelectItem>
                  <SelectItem value="high">{t('priority_high')}</SelectItem>
                  <SelectItem value="critical">{t('priority_critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(status !== ticket.status || priority !== ticket.priority) && (
            <Button onClick={handleStatusChange} className="w-full" variant="secondary">
              {t('save_status')}
            </Button>
          )}

          {ticket.status !== 'closed' && (
            <form onSubmit={handleSendReply} className="flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('reply_placeholder')}
                disabled={isSending}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSending || !replyContent.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {t('send_btn')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
