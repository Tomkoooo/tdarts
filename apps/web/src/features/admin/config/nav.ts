import { ADMIN_CAPABILITIES } from '@/features/admin/lib/admin-capabilities';
import type { AdminNavGroup } from '@/features/admin/types/nav';

/** RBAC-filtered sidebar + future command palette. Paths are locale-relative (`/admin/...`). */
export const adminNavGroups: AdminNavGroup[] = [
  {
    labelKey: 'nav.groups.overview',
    items: [
      {
        titleKey: 'layout.sidebar.dashboard',
        href: '/admin',
        icon: 'dashboard',
        capability: ADMIN_CAPABILITIES.ADMIN_SHELL,
      },
    ],
  },
  {
    labelKey: 'nav.groups.competition',
    items: [
      {
        titleKey: 'layout.sidebar.users',
        href: '/admin/users',
        icon: 'users',
        capability: ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE,
      },
      {
        titleKey: 'layout.sidebar.clubs',
        href: '/admin/clubs',
        icon: 'clubs',
        capability: ADMIN_CAPABILITIES.ADMIN_CLUBS_READ,
      },
      {
        titleKey: 'nav.players',
        href: '/admin/players',
        icon: 'players',
        capability: ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ,
      },
      {
        titleKey: 'layout.sidebar.tournaments',
        href: '/admin/tournaments',
        icon: 'tournaments',
        capability: ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ,
      },
      {
        titleKey: 'nav.matches',
        href: '/admin/matches',
        icon: 'matches',
        capability: ADMIN_CAPABILITIES.ADMIN_MATCHES_READ,
      },
      {
        titleKey: 'layout.sidebar.leagues',
        href: '/admin/leagues',
        icon: 'leagues',
        capability: ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ,
      },
    ],
  },
  {
    labelKey: 'nav.groups.platform',
    items: [
      {
        titleKey: 'layout.sidebar.telemetry',
        href: '/admin/observability',
        icon: 'observability',
        capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
        items: [
          {
            titleKey: 'nav.logs',
            href: '/admin/observability/logs',
            icon: 'observability',
            capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
          },
          {
            titleKey: 'nav.analytics',
            href: '/admin/observability',
            icon: 'observability',
            capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
          },
          {
            titleKey: 'layout.sidebar.errors',
            href: '/admin/observability/errors',
            icon: 'observability',
            capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
          },
        ],
      },
      {
        titleKey: 'layout.sidebar.feedback',
        href: '/admin/support/feedback',
        icon: 'feedback',
        capability: ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ,
      },
      {
        titleKey: 'nav.tools',
        href: '/admin/tools',
        icon: 'tools',
        capability: ADMIN_CAPABILITIES.ADMIN_TOOLS_EXECUTE,
      },
      {
        titleKey: 'nav.feature_access',
        href: '/admin/feature-access',
        icon: 'featureAccess',
        capability: ADMIN_CAPABILITIES.ADMIN_FEATURE_ACCESS_DEBUG_READ,
      },
    ],
  },
  {
    labelKey: 'nav.groups.system',
    items: [
      {
        titleKey: 'layout.sidebar.settings',
        href: '/admin/system',
        icon: 'system',
        capability: ADMIN_CAPABILITIES.ADMIN_SYSTEM_READ,
      },
      {
        titleKey: 'layout.sidebar.ads',
        href: '/admin/ads',
        icon: 'ads',
        capability: ADMIN_CAPABILITIES.ADMIN_ADS_READ,
      },
      {
        titleKey: 'nav.content',
        href: '/admin/content',
        icon: 'content',
        capability: ADMIN_CAPABILITIES.ADMIN_CONTENT_READ,
      },
      {
        titleKey: 'nav.data',
        href: '/admin/data',
        icon: 'data',
        capability: ADMIN_CAPABILITIES.ADMIN_DATA_EXPLORER_READ,
      },
    ],
  },
];
