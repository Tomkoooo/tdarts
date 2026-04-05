"use client";

import React from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, User as UserIcon, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useUserContext } from '@/hooks/useUser';
import { markTicketReadAction, replyTicketAction } from '@/features/profile/actions';
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
  messages: Message[];
  userId?: any;
  isReadByUser: boolean;
  isReadByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onUpdate?: () => void;
}

function statusTranslationKey(status: Ticket['status']): string {
  if (status === 'in-progress') return 'status_in_progress';
  return `status_${status}` as string;
}

export default function TicketDetail({ ticket: initialTicket, onBack, onUpdate }: TicketDetailProps) {
  const { user } = useUserContext();
  const locale = useLocale();
  const t = useTranslations('Profile.tickets.detail');
  const [ticket, setTicket] = React.useState(initialTicket);
  const [replyContent, setReplyContent] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
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
        ? t('read_user_sent_support_seen')
        : t('read_user_sent_support_unseen');
    }
    return readReceipt.seenByOther
      ? t('read_support_sent_user_seen')
      : t('read_support_sent_user_unseen');
  }, [readReceipt, t]);

  React.useEffect(() => {
    setTicket(initialTicket);
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
      if (!ticket.isReadByUser && markedReadTicketRef.current !== ticket._id) {
        try {
          markedReadTicketRef.current = ticket._id;
          await markTicketReadAction({ ticketId: ticket._id });
          setTicket((prev) => ({ ...prev, isReadByUser: true }));
          onUpdate?.();
        } catch (error) {
          markedReadTicketRef.current = null;
          console.error('Error marking ticket as read:', error);
        }
      }
    };
    markAsRead();
  }, [ticket._id, ticket.isReadByUser, onUpdate]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      toast.error(t('toast_empty'));
      return;
    }

    if (ticket.status === 'closed') {
      toast.error(t('toast_closed'));
      return;
    }

    setIsSending(true);
    try {
      const result = await replyTicketAction({
        ticketId: ticket._id,
        content: replyContent.trim(),
      });

      if (result && typeof result === 'object' && 'success' in result && result.success) {
        setTicket((result as any).data);
        setReplyContent('');
        toast.success(t('toast_reply_sent'));
        onUpdate?.();
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error(error?.message || t('toast_reply_error'));
    } finally {
      setIsSending(false);
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
    <div className="flex flex-col h-[600px] bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{ticket.title}</h3>
            <p className="text-xs text-gray-400">#{ticket._id.slice(-6)}</p>
            {readReceiptText && (
              <p className="text-[11px] text-muted-foreground mt-1 pt-1 border-t border-white/10">
                <span className="font-medium text-foreground/80">{t('read_receipt_label')}: </span>
                {readReceiptText}
              </p>
            )}
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

      {ticket.status !== 'closed' ? (
        <form onSubmit={handleSendReply} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
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
          </div>
        </form>
      ) : (
        <div className="p-4 border-t border-white/10 text-center text-gray-400 text-sm">{t('closed_ticket')}</div>
      )}
    </div>
  );
}
