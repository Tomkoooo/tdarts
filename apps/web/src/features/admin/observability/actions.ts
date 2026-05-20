'use server';

import { revalidatePath } from 'next/cache';
import type { ILog } from '@tdarts/core';
import {
  AdminAuthorizationService,
  AdminObservabilityService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';

export async function adminListObservabilityLogsAction(filters: {
  level?: string;
  category?: string;
  adminOnly?: boolean;
  actorUserId?: string;
  metadataTargetUserId?: string;
  requestId?: string;
  page?: number;
  limit?: number;
}): Promise<{ ok: true; logs: Record<string, unknown>[] } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    const limit = Math.min(filters.limit ?? 80, 200);
    const page = Math.max(filters.page ?? 1, 1);
    const logs = await AdminObservabilityService.listLogs({
      level: filters.level as ILog['level'] | undefined,
      category: filters.category as ILog['category'] | undefined,
      adminOnly: filters.adminOnly,
      actorUserId: filters.actorUserId,
      metadataTargetUserId: filters.metadataTargetUserId,
      requestId: filters.requestId,
      limit,
      skip: (page - 1) * limit,
    });
    return { ok: true, logs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load logs' };
  }
}

export async function adminGetObservabilityDashboardAction(): Promise<
  | { ok: true; snapshot: Awaited<ReturnType<typeof AdminObservabilityService.getDashboardSnapshot>> }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    const snapshot = await AdminObservabilityService.getDashboardSnapshot();
    return { ok: true, snapshot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load dashboard' };
  }
}

export async function adminListApiMetricsAction(
  limit?: number,
): Promise<{ ok: true; metrics: Record<string, unknown>[] } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    const metrics = await AdminObservabilityService.listApiRequestMetrics({ limit });
    return { ok: true, metrics };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load metrics' };
  }
}

export async function adminListApiErrorsAction(filters: {
  requestId?: string;
  routeKey?: string;
  resolved?: 'all' | 'open' | 'resolved';
  page?: number;
  limit?: number;
}): Promise<{ ok: true; events: Record<string, unknown>[] } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    const limit = Math.min(filters.limit ?? 80, 150);
    const page = Math.max(filters.page ?? 1, 1);
    let isResolved: boolean | undefined;
    if (filters.resolved === 'open') isResolved = false;
    if (filters.resolved === 'resolved') isResolved = true;

    const events = await AdminObservabilityService.listApiErrorEvents({
      requestId: filters.requestId,
      routeKey: filters.routeKey,
      isResolved,
      limit,
      skip: (page - 1) * limit,
    });
    return { ok: true, events };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load errors' };
  }
}

export async function adminGetApiErrorAction(
  id: string,
): Promise<{ ok: true; event: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    const event = await AdminObservabilityService.getApiErrorEventById(id);
    if (!event) return { ok: false, error: 'Not found' };
    return { ok: true, event };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load error' };
  }
}

export async function adminResolveErrorEventAction(
  locale: string,
  eventId: string,
  resolved: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_OBSERVABILITY_READ);
    await AdminObservabilityService.resolveApiErrorEvent(actor._id, eventId, resolved);
    revalidatePath(`/${locale}/admin/observability`);
    revalidatePath(`/${locale}/admin/observability/errors`);
    revalidatePath(`/${locale}/admin/observability/errors/${eventId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
