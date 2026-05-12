'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminAuditService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import {
  getSystemSettings,
  updateFeatureToggle,
  updateSubscriptionPaywallEnabled,
  updateSuperAdminBypassEnabled,
} from '@tdarts/core/system-settings';
import type { FeatureToggleKey } from '@tdarts/core';

async function requireSystemWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(
    user._id,
    ADMIN_CAPABILITIES.ADMIN_SYSTEM_WRITE,
  );
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminUpdateFeatureToggleAction(
  locale: string,
  key: FeatureToggleKey,
  enabled: boolean,
): Promise<{ ok: boolean; snapshot?: Awaited<ReturnType<typeof getSystemSettings>>; error?: string }> {
  try {
    const user = await requireSystemWrite();
    const snapshot = await updateFeatureToggle(key, enabled, user._id);
    await AdminAuditService.logAction(user._id, 'system.updateFeatureToggle', { key, enabled });
    revalidatePath(`/${locale}/admin/system`);
    revalidatePath(`/${locale}/admin`);
    return { ok: true, snapshot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminUpdatePaywallAction(
  locale: string,
  enabled: boolean,
): Promise<{ ok: boolean; snapshot?: Awaited<ReturnType<typeof getSystemSettings>>; error?: string }> {
  try {
    const user = await requireSystemWrite();
    const snapshot = await updateSubscriptionPaywallEnabled(enabled, user._id);
    await AdminAuditService.logAction(user._id, 'system.updateSubscriptionPaywall', { enabled });
    revalidatePath(`/${locale}/admin/system`);
    revalidatePath(`/${locale}/admin`);
    return { ok: true, snapshot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminUpdateSuperAdminBypassAction(
  locale: string,
  enabled: boolean,
): Promise<{ ok: boolean; snapshot?: Awaited<ReturnType<typeof getSystemSettings>>; error?: string }> {
  try {
    const user = await requireSystemWrite();
    const snapshot = await updateSuperAdminBypassEnabled(enabled, user._id);
    await AdminAuditService.logAction(user._id, 'system.updateSuperAdminBypass', { enabled });
    revalidatePath(`/${locale}/admin/system`);
    return { ok: true, snapshot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
