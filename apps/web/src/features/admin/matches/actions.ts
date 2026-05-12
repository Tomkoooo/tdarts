'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminMatchesMutationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

async function requireMatchWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminRevertMatchOverrideAction(
  locale: string,
  matchId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireMatchWrite();
    await AdminMatchesMutationService.revertManualOverride(actor._id, matchId);
    revalidatePath(`/${locale}/admin/matches/${matchId}`);
    revalidatePath(`/${locale}/admin/matches`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
