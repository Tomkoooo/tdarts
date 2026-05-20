import type { AdminListSortDir } from '@/features/admin/lib/list-params';

export type AdminListDefaults = {
  sort: string;
  dir: AdminListSortDir;
  limit?: number;
};

/** Per-entity default sort (URL + server query when sort param omitted). */
export const ADMIN_LIST_DEFAULTS = {
  users: { sort: 'updatedAt', dir: 'desc' as const },
  clubs: { sort: 'updatedAt', dir: 'desc' as const },
  players: { sort: 'updatedAt', dir: 'desc' as const },
  tournaments: { sort: 'updatedAt', dir: 'desc' as const },
  matches: { sort: 'updated', dir: 'desc' as const },
  leagues: { sort: 'updatedAt', dir: 'desc' as const },
  feedback: { sort: 'created', dir: 'desc' as const },
  subscriptions: { sort: 'created', dir: 'desc' as const },
  content: { sort: 'expires', dir: 'desc' as const },
  logs: { sort: 'created', dir: 'desc' as const },
  errors: { sort: 'created', dir: 'desc' as const },
} satisfies Record<string, AdminListDefaults>;
