'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminFeedbackMutationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';

async function requireSupportRead() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ);
  if (!ok) throw new Error('Forbidden');
  return user;
}

async function requireSupportWrite() {
  const user = await getServerUser();
  if (!user) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(user._id, ADMIN_CAPABILITIES.ADMIN_SUPPORT_WRITE);
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function adminFeedbackStatusAction(
  locale: string,
  feedbackId: string,
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSupportWrite();
    await AdminFeedbackMutationService.updateStatus(actor._id, feedbackId, status);
    revalidatePath(`/${locale}/admin/support/feedback`);
    revalidatePath(`/${locale}/admin/support/feedback/${feedbackId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminFeedbackMessageAction(
  locale: string,
  feedbackId: string,
  content: string,
  isInternal: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSupportWrite();
    await AdminFeedbackMutationService.addAdminMessage(actor._id, feedbackId, content, isInternal);
    revalidatePath(`/${locale}/admin/support/feedback/${feedbackId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminFeedbackMarkReadAction(
  locale: string,
  feedbackId: string,
  read: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSupportRead();
    await AdminFeedbackMutationService.markAdminRead(actor._id, feedbackId, read);
    revalidatePath(`/${locale}/admin/support/feedback`);
    revalidatePath(`/${locale}/admin/support/feedback/${feedbackId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
