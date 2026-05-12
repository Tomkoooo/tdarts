'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminUsersMutationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

async function requireUsersManage() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE);
  if (!ok) throw new Error('Forbidden');
  return user;
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
