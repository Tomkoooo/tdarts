'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminPlayersMutationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

async function requirePlayerWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_PLAYERS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminUpdatePlayerBasicsAction(
  locale: string,
  playerId: string,
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requirePlayerWrite();
    const name = String(form.get('name') ?? '').trim();
    const countryRaw = form.get('country');
    const country = countryRaw === '' ? null : String(countryRaw ?? '').trim() || null;
    await AdminPlayersMutationService.updateBasics(actor._id, playerId, { name: name || undefined, country });
    revalidatePath(`/${locale}/admin/players/${playerId}`);
    revalidatePath(`/${locale}/admin/players`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
