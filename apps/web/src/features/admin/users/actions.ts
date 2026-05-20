'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminObservabilityService,
  AdminUsersMutationService,
  AdminUsersQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminUserListRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export type AdminUsersListParams = AdminListParams & {
  isVerified?: 'all' | 'yes' | 'no';
  isDeleted?: 'all' | 'yes' | 'no';
  isAdmin?: 'all' | 'yes' | 'no';
};

export async function adminListUsersAction(
  params: AdminUsersListParams,
): Promise<
  { ok: true; total: number; rows: AdminUserListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE);
    const { total, rows } = await AdminUsersQueryService.list({
      q: params.q,
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
      isVerified: params.isVerified,
      isDeleted: params.isDeleted,
      isAdmin: params.isAdmin,
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load users' };
  }
}

export async function adminGetUserDetailAction(userId: string): Promise<
  | {
      ok: true;
      user: Awaited<ReturnType<typeof AdminUsersQueryService.getById>>;
      context: Awaited<ReturnType<typeof AdminUsersQueryService.getUserAdminContext>>;
      auditLogs: Record<string, unknown>[];
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE);
    const [user, context] = await Promise.all([
      AdminUsersQueryService.getById(userId),
      AdminUsersQueryService.getUserAdminContext(userId),
    ]);
    if (!user) return { ok: false, error: 'User not found' };
    const auditLogs = await AdminObservabilityService.listLogs({
      adminOnly: true,
      metadataTargetUserId: userId,
      limit: 40,
    });
    return { ok: true, user, context, auditLogs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load user' };
  }
}

async function requireUsersManage() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminPatchUserFieldsAction(
  locale: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireUsersManage();
    const normalized: Parameters<typeof AdminUsersMutationService.updateUser>[2] = {};
    if (typeof patch.name === 'string') normalized.name = patch.name;
    if (typeof patch.username === 'string') normalized.username = patch.username;
    if (typeof patch.email === 'string') normalized.email = patch.email;
    if (typeof patch.locale === 'string') normalized.locale = patch.locale;
    if (patch.country !== undefined) normalized.country = patch.country as string | null;
    if (typeof patch.isAdmin === 'boolean') normalized.isAdmin = patch.isAdmin;
    if (typeof patch.isVerified === 'boolean') normalized.isVerified = patch.isVerified;
    if (typeof patch.isDeleted === 'boolean') normalized.isDeleted = patch.isDeleted;
    if (typeof patch.adminRoles === 'string') {
      normalized.adminRoles = patch.adminRoles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(patch.adminRoles)) {
      normalized.adminRoles = patch.adminRoles.map(String);
    }
    await AdminUsersMutationService.updateUser(actor._id, userId, normalized);
    revalidatePath(`/${locale}/admin/users/${userId}`);
    revalidatePath(`/${locale}/admin/users`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminUpdateUserAction(
  locale: string,
  userId: string,
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireUsersManage();
    const patch = {
      isAdmin: form.get('isAdmin') === 'on',
      isVerified: form.get('isVerified') === 'on',
      isDeleted: form.get('isDeleted') === 'on',
      adminRoles: String(form.get('adminRoles') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    await AdminUsersMutationService.updateUser(actor._id, userId, patch);
    revalidatePath(`/${locale}/admin/users/${userId}`);
    revalidatePath(`/${locale}/admin/users`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminSetUserPasswordAction(
  locale: string,
  userId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireUsersManage();
    await AdminUsersMutationService.setPassword(actor._id, userId, password);
    revalidatePath(`/${locale}/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminRevertUserAction(
  locale: string,
  userId: string,
  snapshotBeforeJson: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireUsersManage();
    const snapshotBefore = JSON.parse(snapshotBeforeJson) as Record<string, unknown>;
    await AdminUsersMutationService.revertUserPatch(actor._id, userId, snapshotBefore);
    revalidatePath(`/${locale}/admin/users/${userId}`);
    revalidatePath(`/${locale}/admin/users`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
