'use server';

import { connectMongo } from '@/lib/mongoose';
import { authorizeUserResult } from '@/shared/lib/guards';
import {
  AdCampaignService,
  AdminAuthorizationService,
  ADMIN_CAPABILITIES,
  type AdminCapability,
  AdTelemetryService,
} from '@tdarts/services';
import { AdCampaignModel, AdCreativeModel } from '@tdarts/core';

function success(data: unknown, status = 200) {
  return { ok: true, status, data };
}

function failure(message: string, status = 400) {
  return { ok: false, status, data: { success: false, error: message, message } };
}

async function assertAdminCapability(capability: AdminCapability) {
  const auth = await authorizeUserResult();
  if (!auth.ok) return { error: failure(auth.message || 'Unauthorized', auth.status || 401) };
  const allowed = await AdminAuthorizationService.hasAdminCapability(auth.data.userId, capability);
  if (!allowed) return { error: failure('Forbidden', 403) };
  return { userId: auth.data.userId };
}

export async function adminAdsCampaignListAction() {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_READ);
    if ('error' in guard) return guard.error;
    const campaigns = await AdCampaignService.listCampaigns();
    return success({ campaigns });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to list campaigns', 500);
  }
}

export async function adminAdsCampaignUpsertAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
    if ('error' in guard) return guard.error;
    const campaign = await AdCampaignService.upsertCampaign({
      id: payload.id ? String(payload.id) : undefined,
      name: String(payload.name || ''),
      status: (payload.status as 'draft' | 'active' | 'paused' | 'ended') || 'draft',
      priority: Number(payload.priority || 100),
      startAt: new Date(String(payload.startAt || new Date().toISOString())),
      endAt: new Date(String(payload.endAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())),
      audienceRoles: Array.isArray(payload.audienceRoles) ? payload.audienceRoles.map(String) : [],
      allowedViewTypes: Array.isArray(payload.allowedViewTypes)
        ? (payload.allowedViewTypes as Array<'block' | 'landscape' | 'popup' | 'inline'>)
        : ['block', 'landscape', 'popup', 'inline'],
      maxImpressionsPerActor: Number(payload.maxImpressionsPerActor || 8),
      windowHours: Number(payload.windowHours || 24),
      noFillRate: Number(payload.noFillRate || 0),
      createdBy: guard.userId,
      updatedBy: guard.userId,
    });
    return success({ campaign });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to save campaign', 500);
  }
}

export async function adminAdsCampaignDeleteAction(campaignId: string) {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
    if ('error' in guard) return guard.error;
    await AdCampaignService.deleteCampaign(campaignId);
    return success({ success: true });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to delete campaign', 500);
  }
}

export async function adminAdsCreativeListAction(campaignId: string) {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_READ);
    if ('error' in guard) return guard.error;
    await connectMongo();
    const creatives = await AdCreativeModel.find({ campaignId }).sort({ createdAt: -1 }).lean();
    return success({ creatives });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to list creatives', 500);
  }
}

export async function adminAdsCreativeUpsertAction(payload: Record<string, unknown>) {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
    if ('error' in guard) return guard.error;
    await connectMongo();
    const update = {
      campaignId: String(payload.campaignId || ''),
      name: String(payload.name || ''),
      viewType: (payload.viewType as 'block' | 'landscape' | 'popup' | 'inline') || 'block',
      title: String(payload.title || ''),
      bodyText: String(payload.bodyText || ''),
      ctaLabel: String(payload.ctaLabel || ''),
      destinationUrl: String(payload.destinationUrl || ''),
      mediaSource: {
        type: payload.mediaSourceType === 'media_id' ? 'media_id' : 'external_url',
        mediaId: payload.mediaId ? String(payload.mediaId) : undefined,
        externalUrl: String(payload.externalUrl || ''),
      },
      accessibility: { altText: String(payload.altText || ''), ariaLabel: String(payload.ariaLabel || '') },
      isActive: payload.isActive !== false,
      weight: Number(payload.weight || 1),
    };
    const creative = payload.id
      ? await AdCreativeModel.findByIdAndUpdate(String(payload.id), update, { new: true })
      : await AdCreativeModel.create(update);
    return success({ creative });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to save creative', 500);
  }
}

export async function adminAdsOverviewAction() {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ);
    if ('error' in guard) return guard.error;
    await connectMongo();
    const [campaignCount, creativeCount, activeCount] = await Promise.all([
      AdCampaignModel.countDocuments({}),
      AdCreativeModel.countDocuments({}),
      AdCampaignModel.countDocuments({ status: 'active' }),
    ]);
    return success({ campaignCount, creativeCount, activeCount });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to load overview', 500);
  }
}

export async function adminAdsTelemetrySummaryAction(params: { start?: string; end?: string }) {
  try {
    const guard = await assertAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ);
    if ('error' in guard) return guard.error;
    await connectMongo();

    const startDate = params.start ? new Date(params.start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = params.end ? new Date(params.end) : new Date();
    const telemetry = await AdTelemetryService.getTelemetrySummary({ start: startDate, end: endDate });
    return success(telemetry);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Failed to load ads telemetry', 500);
  }
}
