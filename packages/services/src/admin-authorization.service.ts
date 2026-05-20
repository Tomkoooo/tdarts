import { connectMongo, UserModel } from '@tdarts/core';

export const ADMIN_ROLES = {
  MARKETING: 'marketing',
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

/**
 * Fine-grained staff capabilities. `User.isAdmin` (super-admin) implies all of these.
 * Scoped roles (e.g. marketing) receive a subset via `ROLE_CAPABILITIES`.
 *
 * Product feature bypass (`SystemSettings.superAdminBypassEnabled`) is separate:
 * it affects runtime feature gates for global admins, not this admin panel ACL.
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

const ROLE_CAPABILITIES: Record<AdminRole, AdminCapability[]> = {
  [ADMIN_ROLES.MARKETING]: [
    ADMIN_CAPABILITIES.ADMIN_SHELL,
    ADMIN_CAPABILITIES.ADMIN_ADS_READ,
    ADMIN_CAPABILITIES.ADMIN_ADS_WRITE,
    ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ,
  ],
};

function normalizeRoles(roles: unknown): AdminRole[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => String(r).trim().toLowerCase())
    .filter((r): r is AdminRole => Object.values(ADMIN_ROLES).includes(r as AdminRole));
}

export class AdminAuthorizationService {
  static async isSuperAdmin(userId: string): Promise<boolean> {
    await connectMongo();
    const user = await UserModel.findById(userId).select('isAdmin').lean();
    return Boolean((user as { isAdmin?: boolean } | null)?.isAdmin);
  }

  static async getAdminRoles(userId: string): Promise<AdminRole[]> {
    await connectMongo();
    const user = await UserModel.findById(userId).select('adminRoles').lean();
    return normalizeRoles((user as { adminRoles?: unknown[] } | null)?.adminRoles);
  }

  static async canAccessAdminShell(userId: string): Promise<boolean> {
    if (await this.isSuperAdmin(userId)) return true;
    const roles = await this.getAdminRoles(userId);
    return roles.some((r) => ROLE_CAPABILITIES[r]?.includes(ADMIN_CAPABILITIES.ADMIN_SHELL));
  }

  static async hasAdminCapability(userId: string, capability: AdminCapability): Promise<boolean> {
    if (await this.isSuperAdmin(userId)) return true;
    const roles = await this.getAdminRoles(userId);
    return roles.some((r) => ROLE_CAPABILITIES[r]?.includes(capability));
  }

  /** Effective capabilities for menu gating and server-side checks (deduped). */
  static async getEffectiveCapabilities(userId: string): Promise<AdminCapability[]> {
    if (await this.isSuperAdmin(userId)) {
      return Object.values(ADMIN_CAPABILITIES) as AdminCapability[];
    }
    const roles = await this.getAdminRoles(userId);
    const set = new Set<AdminCapability>();
    for (const r of roles) {
      for (const c of ROLE_CAPABILITIES[r] ?? []) {
        set.add(c);
      }
    }
    return [...set];
  }
}

