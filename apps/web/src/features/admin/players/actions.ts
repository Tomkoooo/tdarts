'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminPlayersMutationService,
  AdminPlayersQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminPlayerListRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export async function adminListPlayersAction(
  params: AdminListParams,
): Promise<
  { ok: true; total: number; rows: AdminPlayerListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ);
    const { total, rows } = await AdminPlayersQueryService.list({
      q: params.q,
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load players' };
  }
}

export async function adminGetPlayerDetailAction(playerId: string): Promise<
  | {
      ok: true;
      player: Record<string, unknown>;
      context: Awaited<ReturnType<typeof AdminPlayersQueryService.getPlayerAdminContext>>;
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_PLAYERS_READ);
    const [player, context] = await Promise.all([
      AdminPlayersQueryService.getById(playerId),
      AdminPlayersQueryService.getPlayerAdminContext(playerId),
    ]);
    if (!player) return { ok: false, error: 'Player not found' };
    return { ok: true, player, context };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load player' };
  }
}

async function requirePlayerWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_PLAYERS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminPatchPlayerFieldsAction(
  locale: string,
  playerId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requirePlayerWrite();
    if (
      patch.name !== undefined ||
      patch.country !== undefined ||
      patch.type !== undefined ||
      patch.publicConsent !== undefined
    ) {
      await AdminPlayersMutationService.updateBasics(actor._id, playerId, {
        name: typeof patch.name === 'string' ? patch.name : undefined,
        country: patch.country !== undefined ? (patch.country as string | null) : undefined,
        type:
          patch.type === 'individual' || patch.type === 'pair' || patch.type === 'team'
            ? patch.type
            : undefined,
        publicConsent:
          typeof patch.publicConsent === 'boolean' ? patch.publicConsent : undefined,
      });
    }
    if (patch.honors !== undefined && Array.isArray(patch.honors)) {
      await AdminPlayersMutationService.updateHonors(actor._id, playerId, patch.honors);
    }
    if (patch.userRef !== undefined) {
      const uid = patch.userRef == null || patch.userRef === '' ? null : String(patch.userRef);
      await AdminPlayersMutationService.linkUserRef(actor._id, playerId, uid);
    }
    revalidatePath(`/${locale}/admin/players/${playerId}`);
    revalidatePath(`/${locale}/admin/players`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
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

export async function adminUpdatePlayerHonorsAction(
  locale: string,
  playerId: string,
  honorsJson: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requirePlayerWrite();
    const honors = JSON.parse(honorsJson) as unknown[];
    if (!Array.isArray(honors)) throw new Error('Honors must be a JSON array');
    await AdminPlayersMutationService.updateHonors(actor._id, playerId, honors);
    revalidatePath(`/${locale}/admin/players/${playerId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminLinkPlayerUserAction(
  locale: string,
  playerId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requirePlayerWrite();
    await AdminPlayersMutationService.linkUserRef(actor._id, playerId, userId.trim() || null);
    revalidatePath(`/${locale}/admin/players/${playerId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
