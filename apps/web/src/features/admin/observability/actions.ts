'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import { AdminAuthorizationService, AdminObservabilityService, ADMIN_CAPABILITIES } from '@tdarts/services';

async function requireObservability() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminResolveErrorEventAction(
  locale: string,
  eventId: string,
  resolved: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireObservability();
    await AdminObservabilityService.resolveApiErrorEvent(actor._id, eventId, resolved);
    revalidatePath(`/${locale}/admin/observability/errors`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
