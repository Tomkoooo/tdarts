'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminClubsMutationService,
  AdminClubsQueryService,
  AdminSubscriptionsQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminClubListRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export type AdminClubsListParams = AdminListParams & {
  verified?: 'all' | 'yes' | 'no';
  isActive?: 'all' | 'yes' | 'no';
};

export async function adminListClubsAction(
  params: AdminClubsListParams,
): Promise<
  { ok: true; total: number; rows: AdminClubListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CLUBS_READ);
    const { total, rows } = await AdminClubsQueryService.list({
      q: params.q,
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
      verified: params.verified ?? 'all',
      isActive: params.isActive ?? 'all',
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load clubs' };
  }
}

export async function adminGetClubDetailAction(clubId: string): Promise<
  | {
      ok: true;
      club: Record<string, unknown>;
      context: Awaited<ReturnType<typeof AdminClubsQueryService.getClubAdminContext>>;
      notificationFollowers: Awaited<
        ReturnType<typeof AdminSubscriptionsQueryService.listByClubId>
      >['rows'];
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CLUBS_READ);
    const [club, context, followers] = await Promise.all([
      AdminClubsQueryService.getById(clubId),
      AdminClubsQueryService.getClubAdminContext(clubId),
      AdminSubscriptionsQueryService.listByClubId(clubId, 100),
    ]);
    if (!club) return { ok: false, error: 'Club not found' };
    return { ok: true, club, context, notificationFollowers: followers.rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load club' };
  }
}

async function requireClubWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_CLUBS_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminUpdateClubSubscriptionAction(
  locale: string,
  clubId: string,
  subscriptionModel: 'free' | 'basic' | 'pro' | 'enterprise',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireClubWrite();
    await AdminClubsMutationService.updateSubscriptionModel(actor._id, clubId, subscriptionModel);
    revalidatePath(`/${locale}/admin/clubs/${clubId}`);
    revalidatePath(`/${locale}/admin/clubs`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminPatchClubFieldsAction(
  locale: string,
  clubId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireClubWrite();
    const profileKeys = ['name', 'description', 'location', 'country', 'landingPage.aboutText'];
    const flagKeys = ['verified', 'isActive', 'subscriptionModel'];
    const hasProfile = profileKeys.some((k) => k in patch);
    const hasFlags = flagKeys.some((k) => k in patch);

    if (hasProfile) {
      const lp = patch['landingPage.aboutText'];
      await AdminClubsMutationService.updateProfile(actor._id, clubId, {
        name: typeof patch.name === 'string' ? patch.name : undefined,
        description: typeof patch.description === 'string' ? patch.description : undefined,
        location: typeof patch.location === 'string' ? patch.location : undefined,
        country: typeof patch.country === 'string' ? patch.country : undefined,
        aboutText: lp !== undefined ? (lp === '' ? null : String(lp)) : undefined,
      });
    }
    if (hasFlags) {
      if (typeof patch.verified === 'boolean' || typeof patch.isActive === 'boolean') {
        await AdminClubsMutationService.updateFlags(actor._id, clubId, {
          verified: typeof patch.verified === 'boolean' ? patch.verified : undefined,
          isActive: typeof patch.isActive === 'boolean' ? patch.isActive : undefined,
        });
      }
      if (typeof patch.subscriptionModel === 'string') {
        await AdminClubsMutationService.updateSubscriptionModel(
          actor._id,
          clubId,
          patch.subscriptionModel as 'free' | 'basic' | 'pro' | 'enterprise',
        );
      }
    }
    revalidatePath(`/${locale}/admin/clubs/${clubId}`);
    revalidatePath(`/${locale}/admin/clubs`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
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
