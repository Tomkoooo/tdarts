'use server';

import { z } from 'zod';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUserResult } from '@/shared/lib/guards';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { revalidateTag } from 'next/cache';

async function assertGlobalAdmin() {
  const authResult = await authorizeUserResult();
  if (!authResult.ok) {
    throw new Error(authResult.message || 'Unauthorized');
  }
  const isAdmin = await AuthorizationService.isGlobalAdmin(authResult.data.userId);
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  return authResult;
}

export async function getAdminAnnouncementsAction(input: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const run = withTelemetry(
    'admin.announcements.list',
    async (payload: { page?: number; limit?: number; search?: string }) => {
      await assertGlobalAdmin();
      const page = Number(payload.page || 1);
      const limit = Number(payload.limit || 10);
      const data = await AnnouncementService.getAnnouncementsForAdmin(
        page,
        limit,
        payload.search
      );
      return serializeForClient({ success: true, ...data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'getAdminAnnouncements' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

const announcementPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error']),
  expiresAt: z.coerce.date(),
  showButton: z.boolean().optional(),
  buttonText: z.string().optional(),
  buttonAction: z.string().optional(),
  duration: z.number().optional(),
  localized: z.any().optional(),
  localeVisibilityMode: z.enum(['strict', 'fallback_en']).optional(),
});

export async function createAdminAnnouncementAction(input: unknown) {
  const run = withTelemetry(
    'admin.announcements.create',
    async (payload: unknown) => {
      await assertGlobalAdmin();
      const parsed = announcementPayloadSchema.parse(payload);
      const created = await AnnouncementService.createAnnouncement(parsed as any);
      revalidateTag('home:announcements', 'max');
      return serializeForClient({ success: true, announcement: created });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'createAdminAnnouncement' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function updateAdminAnnouncementAction(input: {
  id: string;
  payload: unknown;
}) {
  const run = withTelemetry(
    'admin.announcements.update',
    async ({ id, payload }: { id: string; payload: unknown }) => {
      await assertGlobalAdmin();
      const parsedPayload = announcementPayloadSchema.parse(payload);
      const updated = await AnnouncementService.updateAnnouncement(id, parsedPayload as any);
      revalidateTag('home:announcements', 'max');
      return serializeForClient({ success: true, announcement: updated });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'updateAdminAnnouncement' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function deleteAdminAnnouncementAction(input: { id: string }) {
  const run = withTelemetry(
    'admin.announcements.delete',
    async ({ id }: { id: string }) => {
      await assertGlobalAdmin();
      const deleted = await AnnouncementService.deleteAnnouncement(id);
      revalidateTag('home:announcements', 'max');
      return { success: deleted };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'deleteAdminAnnouncement' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}

export async function toggleAdminAnnouncementAction(input: { id: string }) {
  const run = withTelemetry(
    'admin.announcements.toggle',
    async ({ id }: { id: string }) => {
      await assertGlobalAdmin();
      const toggled = await AnnouncementService.toggleAnnouncement(id);
      revalidateTag('home:announcements', 'max');
      return serializeForClient({ success: true, announcement: toggled });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'toggleAdminAnnouncement' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
