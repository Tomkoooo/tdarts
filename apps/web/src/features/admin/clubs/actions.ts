'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminClubsMutationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

async function requireClubWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_CLUBS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminUpdateClubFlagsAction(
  locale: string,
  clubId: string,
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireClubWrite();
    const patch = {
      verified: form.get('verified') === 'on',
      isActive: form.get('isActive') === 'on',
    };
    await AdminClubsMutationService.updateFlags(actor._id, clubId, patch);
    revalidatePath(`/${locale}/admin/clubs/${clubId}`);
    revalidatePath(`/${locale}/admin/clubs`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
