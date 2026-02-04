"use client"

import React from 'react';
import axios from 'axios';
import { MessageSquare, Clock, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-spinner';

interface Ticket {
  _id: string;
  title: string;
  category: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isReadByUser: boolean;
  createdAt: string;
  updatedAt: string;
  messages: any[];
}

interface TicketListProps {
  onSelectTicket: (ticket: Ticket) => void;
  onRefresh?: () => void;
}

export default function TicketList({ onSelectTicket }: TicketListProps) {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/profile/tickets');
      if (response.data.success) {
        setTickets(response.data.data);
      }
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.response?.data?.error || 'Nem sikerült betölteni a ticketeket');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected':
      case 'closed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-yellow-500" />;
    }
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

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'text-gray-400',
      'medium': 'text-yellow-400',
      'high': 'text-orange-400',
      'critical': 'text-red-400'
    };
    return colors[priority] || 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingScreen text="Ticketek betöltése..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadTickets}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Újrapróbálás
        </button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Még nincs egyetlen ticketed sem</p>
        <p className="text-sm mt-2">Küldj be egy visszajelzést, hogy ticketet hozz létre!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Ticketek ({tickets.length})</h3>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <button
            key={ticket._id}
            onClick={() => onSelectTicket(ticket)}
            className="w-full text-left bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(ticket.status)}
                  <span className="text-sm text-gray-400">{getStatusLabel(ticket.status)}</span>
                  {!ticket.isReadByUser && (
                    <span className="px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                      Új válasz
                    </span>
                  )}
                </div>
                
                <h4 className="font-medium truncate group-hover:text-accent transition-colors">
                  {ticket.title}
                </h4>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {ticket.messages?.length || 0} üzenet
                  </span>
                  <span>•</span>
                  <span>{new Date(ticket.updatedAt).toLocaleDateString('hu-HU')}</span>
                  <span>•</span>
                  <span className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </span>
                </div>
              </div>

              <div className="text-gray-400 group-hover:text-white transition-colors">
                →
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
