"use client"

import React from 'react';
import axios from 'axios';
import { Ticket } from 'lucide-react';

export function useUnreadTickets() {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const checkUnreadTickets = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/profile/tickets');
      if (response.data.success) {
        const unread = response.data.data.filter((ticket: any) => !ticket.isReadByUser).length;
        setUnreadCount(unread);
      }
    } catch {
      // User not logged in or error - silently ignore
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    checkUnreadTickets();
    // Re-check every 5 minutes
    const interval = setInterval(checkUnreadTickets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkUnreadTickets]);

  return { unreadCount, loading, refresh: checkUnreadTickets };
}

interface UnreadTicketToastProps {
  unreadCount: number;
  onDismiss: () => void;
}

import { Link } from "@/i18n/routing";
import { useTranslations } from 'next-intl';

export function UnreadTicketToast({ unreadCount, onDismiss }: UnreadTicketToastProps) {
  const t = useTranslations();
  if (unreadCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-accent/30 rounded-lg shadow-lg p-4 max-w-sm flex items-start gap-3">
        <div className="bg-accent/20 p-2 rounded-lg">
          <Ticket className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{t('Tickets.toast_title')}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {t('Tickets.unread_messages', { count: unreadCount })}
          </div>
          <div className="flex gap-2 mt-3">
            <Link
              href="/profile?tab=tickets"
              className="text-xs px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-md transition-colors"
            >
              {t('Common.view')}
            </Link>
            <button
              onClick={onDismiss}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
            >
              {t('Common.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
