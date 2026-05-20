'use server';

import { revalidatePath } from 'next/cache';
import {
  ADMIN_CAPABILITIES,
  AdminAuditService,
  AnnouncementService,
} from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';
import { toListSort, type AdminListParams } from '@/features/admin/lib/list-params';

export type AdminAnnouncementRow = {
  _id: string;
  title: string;
  type: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
};

function toRow(doc: Record<string, unknown>): AdminAnnouncementRow {
  const expiresAt = doc.expiresAt;
  const createdAt = doc.createdAt;
  return {
    _id: String(doc._id),
    title: String(doc.title ?? ''),
    type: String(doc.type ?? 'info'),
    isActive: Boolean(doc.isActive),
    expiresAt:
      expiresAt instanceof Date
        ? expiresAt.toISOString()
        : typeof expiresAt === 'string'
          ? new Date(expiresAt).toISOString()
          : new Date().toISOString(),
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === 'string'
          ? new Date(createdAt).toISOString()
          : new Date().toISOString(),
  };
}

function plainDoc(doc: unknown): Record<string, unknown> {
  if (doc && typeof doc === 'object' && 'toObject' in doc && typeof (doc as { toObject: () => unknown }).toObject === 'function') {
    return (doc as { toObject: () => Record<string, unknown> }).toObject();
  }
  return doc as Record<string, unknown>;
}

export async function adminListAnnouncementsAction(
  params: AdminListParams,
): Promise<
  { ok: true; total: number; rows: AdminAnnouncementRow[] } | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CONTENT_READ);
    const sort = toListSort(params);
    const page = params.page;
    const limit = params.limit;
    const { announcements, total } = await AnnouncementService.getAnnouncementsForAdmin(
      page,
      limit,
      params.q,
    );
    let rows = announcements.map((a) => toRow(plainDoc(a)));
    if (sort?.key === 'title') {
      rows = [...rows].sort((a, b) => {
        const c = a.title.localeCompare(b.title, 'hu');
        return sort.dir === 'asc' ? c : -c;
      });
    } else if (sort?.key === 'expires') {
      rows = [...rows].sort((a, b) => {
        const c = a.expiresAt.localeCompare(b.expiresAt);
        return sort.dir === 'asc' ? c : -c;
      });
    }
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load announcements' };
  }
}

export async function adminCreateAnnouncementAction(
  locale: string,
  input: {
    title: string;
    description: string;
    type: 'info' | 'success' | 'warning' | 'error';
    expiresAt: string;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CONTENT_WRITE);
    const doc = await AnnouncementService.createAnnouncement({
      ...input,
      expiresAt: new Date(input.expiresAt),
    });
    await AdminAuditService.logAction(user._id, 'content.createAnnouncement', { id: String(doc._id) });
    revalidatePath(`/${locale}/admin/content`);
    return { ok: true, id: String(doc._id) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminUpdateAnnouncementAction(
  locale: string,
  id: string,
  input: Partial<{
    title: string;
    description: string;
    type: 'info' | 'success' | 'warning' | 'error';
    expiresAt: string;
    isActive: boolean;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CONTENT_WRITE);
    const { expiresAt, ...rest } = input;
    await AnnouncementService.updateAnnouncement(id, {
      ...rest,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    });
    await AdminAuditService.logAction(user._id, 'content.updateAnnouncement', { id });
    revalidatePath(`/${locale}/admin/content`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminDeleteAnnouncementAction(
  locale: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CONTENT_WRITE);
    const ok = await AnnouncementService.deleteAnnouncement(id);
    if (!ok) return { ok: false, error: 'Not found' };
    await AdminAuditService.logAction(user._id, 'content.deleteAnnouncement', { id });
    revalidatePath(`/${locale}/admin/content`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminToggleAnnouncementAction(
  locale: string,
  announcementId: string,
): Promise<{ ok: boolean; row?: AdminAnnouncementRow; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_CONTENT_WRITE);
    const updated = await AnnouncementService.toggleAnnouncement(announcementId);
    if (!updated) return { ok: false, error: 'Not found' };
    const plain = plainDoc(updated);
    await AdminAuditService.logAction(user._id, 'content.toggleAnnouncement', {
      announcementId,
      isActive: plain.isActive,
    });
    revalidatePath(`/${locale}/admin/content`);
    return { ok: true, row: toRow(plain) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
