import { getServerUser } from '@/lib/getServerUser';
import { AdminAuthorizationService } from '@tdarts/services';
import type { AdminCapability } from '@/features/admin/lib/admin-capabilities';

export async function requireAdminCapability(capability: AdminCapability) {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, capability);
  if (!ok) throw new Error('Forbidden');
  return user;
}
