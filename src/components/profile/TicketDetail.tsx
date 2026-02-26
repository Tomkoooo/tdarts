import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, User as UserIcon, Shield } from 'lucide-react';
import { useUserContext } from '@/hooks/useUser';

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

export default function TicketDetail({ ticket: initialTicket, onBack, onUpdate }: TicketDetailProps) {
  const { user } = useUserContext();
  const [ticket, setTicket] = React.useState(initialTicket);
  const [replyContent, setReplyContent] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const markedReadTicketRef = React.useRef<string | null>(null);

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

  // Mark ticket as read when opened
  React.useEffect(() => {
    const markAsRead = async () => {
      if (!ticket.isReadByUser && markedReadTicketRef.current !== ticket._id) {
        try {
          markedReadTicketRef.current = ticket._id;
          await axios.post(`/api/feedback/${ticket._id}/mark-read`);
          setTicket((prev) => ({ ...prev, isReadByUser: true }));
          onUpdate?.(); // Refresh parent to update unread count
        } catch (error) {
          markedReadTicketRef.current = null;
          console.error('Error marking ticket as read:', error);
        }
      }
    };
    markAsRead();
  }, [ticket._id, ticket.isReadByUser]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      toast.error('Az üzenet nem lehet üres');
      return;
    }

    if (ticket.status === 'closed') {
      toast.error('Ez a ticket már le van zárva');
      return;
    }

    setIsSending(true);
    try {
      const response = await axios.post(`/api/feedback/${ticket._id}/reply`, {
        content: replyContent.trim()
      });

      if (response.data.success) {
        setTicket(response.data.data);
        setReplyContent('');
        toast.success('Válasz elküldve');
        onUpdate?.(); // Refresh to update unread counts
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error(error.response?.data?.error || 'Hiba történt az üzenet küldése során');
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'resolved': 'bg-green-500/20 text-green-400 border-green-500/30',
      'rejected': 'bg-red-500/20 text-red-400 border-red-500/30',
      'closed': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Függőben',
      'in-progress': 'Folyamatban',
      'resolved': 'Megoldva',
      'rejected': 'Elutasítva',
      'closed': 'Lezárva'
    };
    return labels[status] || status;
  };

  return (
    <div className="flex flex-col h-[600px] bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-semibold">{ticket.title}</h3>
            <p className="text-xs text-gray-400">#{ticket._id.slice(-6)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages.map((message, index) => {
            // System message (no sender - status changes)
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
            const senderName = message.sender?.name || 'Rendszer';
            const isAdmin = message.sender?.isAdmin;

            return (
              <div
                key={index}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {isAdmin && <Shield className="w-3 h-3 text-accent" />}
                    {!isOwn && <UserIcon className="w-3 h-3" />}
                    <span>{senderName}</span>
                    <span>•</span>
                    <span>{new Date(message.createdAt).toLocaleString('hu-HU')}</span>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-accent text-white'
                        : 'bg-white/10 text-gray-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-400 py-8">
            Még nincs üzenet ebben a ticketben
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Form */}
      {ticket.status !== 'closed' ? (
        <form onSubmit={handleSendReply} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Írj egy üzenetet..."
              disabled={isSending}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !replyContent.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Küldés
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 border-t border-white/10 text-center text-gray-400 text-sm">
          Ez a ticket le van zárva. További válaszokat nem lehet küldeni.
        </div>
      )}
    </div>
  );
}
