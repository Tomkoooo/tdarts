import { ADMIN_CAPABILITIES, type AdminCapability } from '@tdarts/services';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string; // Material Symbols icon name
  capability?: AdminCapability;
  badge?: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/admin',
        icon: 'dashboard',
        capability: ADMIN_CAPABILITIES.ADMIN_SHELL,
      },
    ],
  },
  {
    label: 'Users & Accounts',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: 'group',
        capability: ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE,
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        label: 'Clubs',
        href: '/admin/clubs',
        icon: 'store',
        capability: ADMIN_CAPABILITIES.ADMIN_CLUBS_READ,
      },
      {
        label: 'Tournaments',
        href: '/admin/tournaments',
        icon: 'emoji_events',
        capability: ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ,
      },
      {
        label: 'Players',
        href: '/admin/players',
        icon: 'person',
        capability: ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ,
      },
      {
        label: 'Matches',
        href: '/admin/matches',
        icon: 'sports_score',
        capability: ADMIN_CAPABILITIES.ADMIN_MATCHES_READ,
      },
      {
        label: 'Leagues',
        href: '/admin/leagues',
        icon: 'leaderboard',
        capability: ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ,
      },
    ],
  },
  {
    label: 'Ads & Marketing',
    items: [
      {
        label: 'Ads',
        href: '/admin/ads',
        icon: 'ad_units',
        capability: ADMIN_CAPABILITIES.ADMIN_ADS_READ,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Settings',
        href: '/admin/system',
        icon: 'settings',
        capability: ADMIN_CAPABILITIES.ADMIN_SYSTEM_READ,
      },
      {
        label: 'Observability',
        href: '/admin/observability',
        icon: 'monitoring',
        capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
      },
      {
        label: 'Tools',
        href: '/admin/tools',
        icon: 'build',
        capability: ADMIN_CAPABILITIES.ADMIN_TOOLS_EXECUTE,
      },
    ],
  },
  {
    label: 'Support',
    items: [
      {
        label: 'Feedback',
        href: '/admin/support/feedback',
        icon: 'feedback',
        capability: ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ,
      },
    ],
  },
  {
    label: 'Debug',
    items: [
      {
        label: 'Feature Access',
        href: '/admin/feature-access',
        icon: 'bug_report',
        capability: ADMIN_CAPABILITIES.ADMIN_FEATURE_ACCESS_DEBUG_READ,
      },
    ],
  },
];

/**
 * Filter nav groups based on user capabilities
 */
export function filterNavByCapabilities(
  groups: AdminNavGroup[],
  capabilities: AdminCapability[]
): AdminNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.capability || capabilities.includes(item.capability)
      ),
    }))
    .filter((group) => group.items.length > 0);
}
