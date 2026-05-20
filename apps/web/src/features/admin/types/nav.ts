import type { AdminCapability } from '@/features/admin/lib/admin-capabilities';

export type AdminNavIcon =
  | 'dashboard'
  | 'users'
  | 'clubs'
  | 'players'
  | 'tournaments'
  | 'matches'
  | 'leagues'
  | 'subscriptions'
  | 'observability'
  | 'support'
  | 'feedback'
  | 'system'
  | 'tools'
  | 'featureAccess'
  | 'ads'
  | 'content'
  | 'data';

export type AdminNavItem = {
  /** next-intl key under Admin.nav or Admin.layout.sidebar */
  titleKey: string;
  /** Path after locale, e.g. `/admin/users` */
  href: string;
  icon: AdminNavIcon;
  capability?: AdminCapability;
  items?: AdminNavItem[];
};

export type AdminNavGroup = {
  labelKey: string;
  items: AdminNavItem[];
};
