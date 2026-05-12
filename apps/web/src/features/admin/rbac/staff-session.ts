import { cache } from 'react';
import { getServerUser, type ServerUser } from '@/lib/getServerUser';
import { AdminAuthorizationService, type AdminCapability } from '@tdarts/services';

export type StaffSession = {
  user: ServerUser;
  userId: string;
  isSuperAdmin: boolean;
  adminRoles: string[];
  capabilities: AdminCapability[];
};

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const user = await getServerUser();
  if (!user) return null;
  const canShell = await AdminAuthorizationService.canAccessAdminShell(user._id);
  if (!canShell) return null;
  const [isSuperAdmin, capabilities] = await Promise.all([
    AdminAuthorizationService.isSuperAdmin(user._id),
    AdminAuthorizationService.getEffectiveCapabilities(user._id),
  ]);
  return {
    user,
    userId: user._id,
    isSuperAdmin,
    adminRoles: user.adminRoles ?? [],
    capabilities,
  };
});

export function staffHasCapability(session: StaffSession, capability: AdminCapability): boolean {
  return session.capabilities.includes(capability);
}
