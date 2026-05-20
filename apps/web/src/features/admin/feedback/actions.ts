'use server';

import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  AdminFeedbackMutationService,
  AdminFeedbackQueryService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import type { AdminFeedbackListRow } from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export type AdminFeedbackListParams = AdminListParams & {
  status?: string;
  priority?: string;
  unreadAdmin?: boolean;
};

export async function adminListFeedbackAction(
  params: AdminFeedbackListParams,
): Promise<
  { ok: true; total: number; rows: AdminFeedbackListRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ);
    const { total, rows } = await AdminFeedbackQueryService.list({
      page: params.page,
      limit: params.limit,
      sort: toListSort(params),
      status: params.status,
      priority: params.priority,
      unreadAdmin: params.unreadAdmin,
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load feedback' };
  }
}

export async function adminGetFeedbackDetailAction(
  feedbackId: string,
): Promise<{ ok: true; feedback: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_SUPPORT_READ);
    const feedback = await AdminFeedbackQueryService.getById(feedbackId);
    if (!feedback) return { ok: false, error: 'Not found' };
    return { ok: true, feedback };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load feedback' };
  }
}

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

export async function adminPatchFeedbackFieldsAction(
  locale: string,
  feedbackId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSupportWrite();
    await AdminFeedbackMutationService.updateFields(actor._id, feedbackId, {
      title: typeof patch.title === 'string' ? patch.title : undefined,
      category: typeof patch.category === 'string' ? patch.category : undefined,
      priority: typeof patch.priority === 'string' ? patch.priority : undefined,
      status: typeof patch.status === 'string' ? patch.status : undefined,
      email: typeof patch.email === 'string' ? patch.email : undefined,
      description: typeof patch.description === 'string' ? patch.description : undefined,
    });
    revalidatePath(`/${locale}/admin/support/feedback/${feedbackId}`);
    revalidatePath(`/${locale}/admin/support/feedback`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
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
