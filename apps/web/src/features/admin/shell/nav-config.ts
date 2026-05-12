import { ADMIN_CAPABILITIES, type AdminCapability } from '@tdarts/services';

export type AdminNavItem = {
  href: string;
  label: string;
  capability: AdminCapability;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', capability: ADMIN_CAPABILITIES.ADMIN_SHELL }],
  },
  {
    label: 'Directory',
    items: [
      { href: '/admin/users', label: 'Users', capability: ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE },
      { href: '/admin/clubs', label: 'Clubs', capability: ADMIN_CAPABILITIES.ADMIN_CLUBS_READ },
      { href: '/admin/tournaments', label: 'Tournaments', capability: ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_READ },
      { href: '/admin/players', label: 'Players', capability: ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ },
      { href: '/admin/matches', label: 'Matches', capability: ADMIN_CAPABILITIES.ADMIN_MATCHES_READ },
      { href: '/admin/leagues', label: 'Leagues', capability: ADMIN_CAPABILITIES.ADMIN_LEAGUES_READ },
      {
        href: '/admin/subscriptions',
        label: 'Subscriptions',
        capability: ADMIN_CAPABILITIES.ADMIN_SUBSCRIPTIONS_READ,
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/system', label: 'System', capability: ADMIN_CAPABILITIES.ADMIN_SYSTEM_READ },
      {
        href: '/admin/feature-access',
        label: 'Feature access',
        capability: ADMIN_CAPABILITIES.ADMIN_FEATURE_ACCESS_DEBUG_READ,
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/admin/ads/campaigns', label: 'Ads · Campaigns', capability: ADMIN_CAPABILITIES.ADMIN_ADS_READ },
      { href: '/admin/ads/creatives', label: 'Ads · Creatives', capability: ADMIN_CAPABILITIES.ADMIN_ADS_READ },
      {
        href: '/admin/ads/telemetry',
        label: 'Ads · Telemetry',
        capability: ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ,
      },
      { href: '/admin/content', label: 'Content', capability: ADMIN_CAPABILITIES.ADMIN_CONTENT_READ },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/support/feedback', label: 'Support', capability: ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ },
      {
        href: '/admin/observability/logs',
        label: 'Logs',
        capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
      },
      {
        href: '/admin/observability/api',
        label: 'API metrics',
        capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
      },
      {
        href: '/admin/observability/errors',
        label: 'Error events',
        capability: ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ,
      },
      { href: '/admin/tools', label: 'Tools', capability: ADMIN_CAPABILITIES.ADMIN_TOOLS_EXECUTE },
    ],
  },
];

export function filterNavGroupsForCapabilities(
  groups: AdminNavGroup[],
  capabilities: AdminCapability[],
): AdminNavGroup[] {
  const set = new Set(capabilities);
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => set.has(item.capability)),
    }))
    .filter((g) => g.items.length > 0);
}
