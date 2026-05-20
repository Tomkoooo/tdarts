'use server';

import { getServerUser } from '@/lib/getServerUser';
import { AdminAuthorizationService } from '@tdarts/services';
import type { AdminSessionContext } from '@/features/admin/types';

export async function getAdminContextAction(): Promise<AdminSessionContext | null> {
  const user = await getServerUser();
  if (!user) return null;

  const capabilities = await AdminAuthorizationService.getEffectiveCapabilities(user._id);

  return {
    user: {
      id: user._id,
      name: user.name || user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      adminRoles: user.adminRoles ?? [],
      profilePicture: user.profilePicture,
    },
    capabilities,
  };
}
