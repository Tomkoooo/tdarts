'use server';

import { revalidatePath } from 'next/cache';
import {
  ADMIN_CAPABILITIES,
  AdminAuditService,
  AdCampaignService,
  AdTelemetryService,
} from '@tdarts/services';
import { AdCampaignModel, AdCreativeModel, connectMongo, getSystemSettings } from '@tdarts/core';
import type { AdViewType } from '@tdarts/core';
import { requireAdminCapability } from '@/features/admin/lib/require-admin-capability';

export type AdminCampaignRow = {
  _id: string;
  name: string;
  status: string;
  priority: number;
  startAt: string;
  endAt: string;
};

export type AdminCreativeRow = {
  _id: string;
  campaignId: string;
  name: string;
  viewType: AdViewType;
  title: string;
  destinationUrl: string;
  isActive: boolean;
};

export type AdminAdsOverview = {
  campaignCount: number;
  creativeCount: number;
  activeCount: number;
  adsEnabled: boolean;
  adsPlaceholderEnabled: boolean;
};

function toCampaignRow(doc: Record<string, unknown>): AdminCampaignRow {
  const startAt = doc.startAt;
  const endAt = doc.endAt;
  return {
    _id: String(doc._id),
    name: String(doc.name ?? ''),
    status: String(doc.status ?? 'draft'),
    priority: Number(doc.priority ?? 0),
    startAt:
      startAt instanceof Date
        ? startAt.toISOString()
        : typeof startAt === 'string'
          ? new Date(startAt).toISOString()
          : new Date().toISOString(),
    endAt:
      endAt instanceof Date
        ? endAt.toISOString()
        : typeof endAt === 'string'
          ? new Date(endAt).toISOString()
          : new Date().toISOString(),
  };
}

function toCreativeRow(doc: Record<string, unknown>): AdminCreativeRow {
  return {
    _id: String(doc._id),
    campaignId: String(doc.campaignId),
    name: String(doc.name ?? ''),
    viewType: (doc.viewType as AdViewType) || 'block',
    title: String(doc.title ?? ''),
    destinationUrl: String(doc.destinationUrl ?? ''),
    isActive: doc.isActive !== false,
  };
}

function plainDoc(doc: unknown): Record<string, unknown> {
  if (
    doc &&
    typeof doc === 'object' &&
    'toObject' in doc &&
    typeof (doc as { toObject: () => unknown }).toObject === 'function'
  ) {
    return (doc as { toObject: () => Record<string, unknown> }).toObject();
  }
  return doc as Record<string, unknown>;
}

export async function adminGetAdsPageDataAction(): Promise<
  | {
      ok: true;
      campaigns: AdminCampaignRow[];
      overview: AdminAdsOverview;
      canWrite: boolean;
      canTelemetry: boolean;
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_READ);
    const [rawCampaigns, settings] = await Promise.all([
      AdCampaignService.listCampaigns(),
      getSystemSettings(),
    ]);
    await connectMongo();
    const [creativeCount, activeCount] = await Promise.all([
      AdCreativeModel.countDocuments({}),
      AdCampaignModel.countDocuments({ status: 'active' }),
    ]);

    let canWrite = false;
    let canTelemetry = false;
    try {
      await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
      canWrite = true;
    } catch {
      canWrite = false;
    }
    try {
      await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ);
      canTelemetry = true;
    } catch {
      canTelemetry = false;
    }

    return {
      ok: true,
      campaigns: rawCampaigns.map((c) => toCampaignRow(plainDoc(c))),
      overview: {
        campaignCount: rawCampaigns.length,
        creativeCount,
        activeCount,
        adsEnabled: settings.features.ADS === true,
        adsPlaceholderEnabled: settings.features.ADS_PLACEHOLDER === true,
      },
      canWrite,
      canTelemetry,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load ads' };
  }
}

export async function adminGetAdsCampaignDetailAction(
  campaignId: string,
): Promise<
  | { ok: true; campaign: AdminCampaignRow; creatives: AdminCreativeRow[]; canWrite: boolean }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_READ);
    await connectMongo();
    const campaign = await AdCampaignModel.findById(campaignId).lean();
    if (!campaign) return { ok: false, error: 'Campaign not found' };
    const creatives = await AdCreativeModel.find({ campaignId }).sort({ createdAt: -1 }).lean();

    let canWrite = false;
    try {
      await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
      canWrite = true;
    } catch {
      canWrite = false;
    }

    return {
      ok: true,
      campaign: toCampaignRow(plainDoc(campaign)),
      creatives: creatives.map((c) => toCreativeRow(plainDoc(c))),
      canWrite,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load campaign' };
  }
}

export async function adminUpsertAdsCampaignAction(
  locale: string,
  payload: {
    id?: string;
    name: string;
    status?: 'draft' | 'active' | 'paused' | 'ended';
    priority?: number;
    startAt?: string;
    endAt?: string;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
    const doc = await AdCampaignService.upsertCampaign({
      id: payload.id,
      name: payload.name.trim(),
      status: payload.status ?? 'draft',
      priority: payload.priority ?? 100,
      startAt: new Date(payload.startAt ?? new Date().toISOString()),
      endAt: new Date(
        payload.endAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ),
      audienceRoles: ['visitor'],
      allowedViewTypes: ['block', 'landscape', 'popup', 'inline'],
      maxImpressionsPerActor: 8,
      windowHours: 24,
      noFillRate: 0.1,
      createdBy: user._id,
      updatedBy: user._id,
    });
    const id = String(plainDoc(doc)._id);
    await AdminAuditService.logAction(user._id, 'ads.upsertCampaign', { id });
    revalidatePath(`/${locale}/admin/ads`);
    revalidatePath(`/${locale}/admin/ads/${id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to save campaign' };
  }
}

export async function adminDeleteAdsCampaignAction(
  locale: string,
  campaignId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
    await AdCampaignService.deleteCampaign(campaignId);
    await AdminAuditService.logAction(user._id, 'ads.deleteCampaign', { campaignId });
    revalidatePath(`/${locale}/admin/ads`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete campaign' };
  }
}

export async function adminUpsertAdsCreativeAction(
  locale: string,
  payload: {
    id?: string;
    campaignId: string;
    name: string;
    viewType?: AdViewType;
    title: string;
    destinationUrl: string;
    externalUrl?: string;
    altText?: string;
    isActive?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_WRITE);
    await connectMongo();
    const update = {
      campaignId: payload.campaignId,
      name: payload.name.trim(),
      viewType: payload.viewType ?? 'block',
      title: payload.title.trim(),
      bodyText: '',
      ctaLabel: '',
      destinationUrl: payload.destinationUrl.trim(),
      mediaSource: {
        type: 'external_url' as const,
        externalUrl: payload.externalUrl?.trim() || '',
      },
      accessibility: {
        altText: payload.altText?.trim() || payload.title.trim(),
        ariaLabel: payload.title.trim(),
      },
      isActive: payload.isActive !== false,
      weight: 1,
    };
    if (payload.id) {
      await AdCreativeModel.findByIdAndUpdate(payload.id, update, { new: true });
    } else {
      await AdCreativeModel.create(update);
    }
    await AdminAuditService.logAction(user._id, 'ads.upsertCreative', {
      campaignId: payload.campaignId,
      creativeId: payload.id,
    });
    revalidatePath(`/${locale}/admin/ads/${payload.campaignId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to save creative' };
  }
}

export async function adminAdsTelemetrySummaryAction(params?: {
  start?: string;
  end?: string;
}): Promise<
  | {
      ok: true;
      data: Awaited<ReturnType<typeof AdTelemetryService.getTelemetrySummary>>;
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdminCapability(ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ);
    const startDate = params?.start ? new Date(params.start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = params?.end ? new Date(params.end) : new Date();
    const data = await AdTelemetryService.getTelemetrySummary({ start: startDate, end: endDate });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load telemetry' };
  }
}
