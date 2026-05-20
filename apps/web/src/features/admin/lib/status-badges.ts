import type { BadgeProps } from '@/components/ui/Badge';

type Variant = NonNullable<BadgeProps['variant']>;

export function getMatchStatusBadgeVariant(status: string): Variant {
  const s = status.toLowerCase();
  if (s === 'finished' || s === 'completed' || s === 'done') return 'success';
  if (s === 'ongoing' || s === 'live' || s === 'in_progress' || s === 'active') return 'warning';
  if (s === 'cancelled' || s === 'canceled' || s === 'aborted') return 'destructive';
  return 'secondary';
}

export function getTournamentStatusBadgeVariant(status: string): Variant {
  const s = status.toLowerCase();
  if (s === 'finished' || s === 'completed') return 'success';
  if (s === 'ongoing' || s === 'active' || s === 'in_progress' || s === 'started') return 'warning';
  if (s === 'cancelled' || s === 'canceled' || s === 'deleted') return 'destructive';
  if (s === 'pending' || s === 'draft' || s === 'registration') return 'outline';
  return 'secondary';
}

export function getFeedbackStatusBadgeVariant(status: string): Variant {
  const s = status.toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'success';
  if (s === 'open' || s === 'new' || s === 'pending') return 'warning';
  if (s === 'in-progress' || s === 'in_progress') return 'default';
  if (s === 'rejected') return 'destructive';
  return 'secondary';
}

export function getFeedbackPriorityBadgeVariant(priority: string): Variant {
  const p = priority.toLowerCase();
  if (p === 'high' || p === 'urgent' || p === 'critical') return 'destructive';
  if (p === 'medium' || p === 'normal') return 'warning';
  return 'outline';
}

export function getAnnouncementTypeBadgeVariant(type: string): Variant {
  const t = type.toLowerCase();
  if (t === 'success') return 'success';
  if (t === 'warning') return 'warning';
  if (t === 'error') return 'destructive';
  return 'secondary';
}

export function getUserRoleBadgeVariant(kind: 'admin' | 'verified' | 'deleted'): Variant {
  if (kind === 'deleted') return 'destructive';
  if (kind === 'admin') return 'default';
  if (kind === 'verified') return 'success';
  return 'outline';
}
