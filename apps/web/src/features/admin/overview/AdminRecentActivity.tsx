'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import type { AdminDashboardActivityItem } from '@/features/admin/types';
import { Link } from '@/i18n/routing';
import {
  AlertTriangle,
  Building2,
  MessageSquareWarning,
  TrendingUp,
  Trophy,
  UserPlus,
  Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  items: AdminDashboardActivityItem[];
};

function kindIcon(kind: AdminDashboardActivityItem['kind']) {
  switch (kind) {
    case 'user_signup':
      return UserPlus;
    case 'club_activity':
      return Building2;
    case 'tournament_change':
      return Trophy;
    case 'feedback_unread':
    case 'critical_feedback':
      return MessageSquareWarning;
    case 'api_spike':
      return Zap;
    case 'api_errors':
      return AlertTriangle;
    default:
      return TrendingUp;
  }
}

function toneBadge(tone: AdminDashboardActivityItem['tone']) {
  if (tone === 'critical') return 'destructive' as const;
  if (tone === 'warning') return 'warning' as const;
  return 'outline' as const;
}

export function AdminRecentActivity({ items }: Props) {
  const t = useTranslations('Admin');

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('dashboard.activities.title')}</CardTitle>
        <CardDescription>
          {items.length > 0
            ? 'Klubok, regisztrációk, versenyek, visszajelzések és API riasztások'
            : t('dashboard.activities.no_data')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('dashboard.activities.no_data')}</p>
        ) : (
          <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => {
              const Icon = kindIcon(item.kind);
              const row = (
                <div className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                  <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium leading-snug">{item.title}</span>
                      <Badge variant={toneBadge(item.tone)} className="text-[10px]">
                        {item.kind.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {item.subtitle ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">{item.subtitle}</p>
                    ) : null}
                    <time className="text-muted-foreground mt-1 block text-xs">
                      {new Date(item.timestamp).toLocaleString('hu-HU')}
                    </time>
                  </div>
                </div>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="block">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
