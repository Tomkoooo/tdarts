'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminTournamentsMutationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

async function requireTournamentWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_TOURNAMENTS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminUpdateTournamentFlagsAction(
  locale: string,
  tournamentMongoId: string,
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireTournamentWrite();
    const patch = {
      isArchived: form.get('isArchived') === 'on',
      isSandbox: form.get('isSandbox') === 'on',
      isDeleted: form.get('isDeleted') === 'on',
      verified: form.get('verified') === 'on',
    };
    await AdminTournamentsMutationService.updateFlags(actor._id, tournamentMongoId, patch);
    revalidatePath(`/${locale}/admin/tournaments/${tournamentMongoId}`);
    revalidatePath(`/${locale}/admin/tournaments`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminRotateTournamentPasswordAction(
  locale: string,
  tournamentMongoId: string,
): Promise<{ ok: boolean; newPassword?: string; error?: string }> {
  try {
    const actor = await requireTournamentWrite();
    const { newPassword } = await AdminTournamentsMutationService.rotateHumanPassword(actor._id, tournamentMongoId);
    revalidatePath(`/${locale}/admin/tournaments/${tournamentMongoId}`);
    return { ok: true, newPassword };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
