import { connectMongo, UserModel } from '@tdarts/core';

export const ADMIN_ROLES = {
  MARKETING: 'marketing',
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

export const ADMIN_CAPABILITIES = {
  ADMIN_SHELL: 'admin:shell:access',
  ADMIN_USERS_MANAGE: 'admin:users:manage',
  ADMIN_ADS_READ: 'admin:ads:read',
  ADMIN_ADS_WRITE: 'admin:ads:write',
  ADMIN_ADS_TELEMETRY_READ: 'admin:ads:telemetry:read',
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
}

