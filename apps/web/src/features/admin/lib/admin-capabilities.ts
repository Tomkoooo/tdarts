/**
 * Client-safe admin capability strings. Keep in sync with
 * `ADMIN_CAPABILITIES` in `packages/services/src/admin-authorization.service.ts`.
 * Do not import `@tdarts/services` from client components — it pulls Mongo/nodemailer.
 */
export const ADMIN_CAPABILITIES = {
  ADMIN_SHELL: 'admin:shell:access',
  ADMIN_USERS_MANAGE: 'admin:users:manage',
  ADMIN_CLUBS_READ: 'admin:clubs:read',
  ADMIN_CLUBS_WRITE: 'admin:clubs:write',
  ADMIN_TOURNAMENTS_READ: 'admin:tournaments:read',
  ADMIN_TOURNAMENTS_WRITE: 'admin:tournaments:write',
  ADMIN_MATCHES_READ: 'admin:matches:read',
  ADMIN_PLAYERS_READ: 'admin:players:read',
  ADMIN_PLAYERS_WRITE: 'admin:players:write',
  ADMIN_LEAGUES_READ: 'admin:leagues:read',
  ADMIN_LEAGUES_WRITE: 'admin:leagues:write',
  ADMIN_SUBSCRIPTIONS_READ: 'admin:subscriptions:read',
  ADMIN_SYSTEM_READ: 'admin:system:read',
  ADMIN_SYSTEM_WRITE: 'admin:system:write',
  ADMIN_FEATURE_ACCESS_DEBUG_READ: 'admin:feature-access:debug:read',
  ADMIN_SUPPORT_READ: 'admin:support:read',
  ADMIN_SUPPORT_WRITE: 'admin:support:write',
  ADMIN_OBSERVABILITY_READ: 'admin:observability:read',
  ADMIN_TOOLS_EXECUTE: 'admin:tools:execute',
  ADMIN_CONTENT_READ: 'admin:content:read',
  ADMIN_CONTENT_WRITE: 'admin:content:write',
  ADMIN_ADS_READ: 'admin:ads:read',
  ADMIN_ADS_WRITE: 'admin:ads:write',
  ADMIN_ADS_TELEMETRY_READ: 'admin:ads:telemetry:read',
  ADMIN_DATA_EXPLORER_READ: 'admin:data-explorer:read',
  ADMIN_DATA_EXPLORER_WRITE: 'admin:data-explorer:write',
} as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[keyof typeof ADMIN_CAPABILITIES];
