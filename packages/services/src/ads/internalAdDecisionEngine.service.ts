import crypto from 'crypto';
import { connectMongo } from '@tdarts/core';
import { AdCampaignModel, AdCreativeModel, AdDeliveryLogModel } from '@tdarts/core';
import type {
  AdCreativePayload,
  AdDecisionEnginePort,
  AdDecisionRequest,
  AdDecisionResult,
} from './adDecisionEngine.port';

function hashActorId(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function pickWeighted<T extends { weight?: number }>(items: T[]): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight ?? 1)), 0);
  if (total <= 0) return items[0] ?? null;
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(0, Number(item.weight ?? 1));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function stableVariantIndex(seed: string, size: number) {
  if (size <= 1) return 0;
  const hash = crypto.createHash('sha1').update(seed).digest();
  const value = hash.readUInt32BE(0);
  return value % size;
}

function buildDecisionId() {
  return crypto.randomUUID();
}

export class InternalAdDecisionEngineService implements AdDecisionEnginePort {
  async decide(request: AdDecisionRequest): Promise<AdDecisionResult> {
    const startedAt = performance.now();
    const decisionId = buildDecisionId();
    const now = request.now || new Date();
    const actorType = request.identity.userId ? 'user' : 'session';
    const actorRawId = request.identity.userId || request.identity.sessionId;
    const actorIdHash = hashActorId(actorRawId);

    try {
      await connectMongo();

      const campaigns = await AdCampaignModel.find({
        status: 'active',
        startAt: { $lte: now },
        endAt: { $gte: now },
        allowedViewTypes: request.slotContext.viewType,
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(64);

      if (campaigns.length === 0) {
        return {
          decisionId,
          ad: null,
          reasonCode: 'no_campaign',
          latencyMs: Math.max(0, performance.now() - startedAt),
        };
      }

      const audienceFiltered = campaigns.filter((campaign) => {
        if (!Array.isArray(campaign.audienceRoles) || campaign.audienceRoles.length === 0) return true;
        return campaign.audienceRoles.some((role) => request.identity.audienceRoles.includes(role));
      });

      if (audienceFiltered.length === 0) {
        return {
          decisionId,
          ad: null,
          reasonCode: 'audience_mismatch',
          latencyMs: Math.max(0, performance.now() - startedAt),
        };
      }

      const uncapped: typeof audienceFiltered = [];
      for (const campaign of audienceFiltered) {
        const windowStart = new Date(now.getTime() - campaign.frequencyCap.windowHours * 60 * 60 * 1000);
        const seenCount = await AdDeliveryLogModel.countDocuments({
          campaignId: campaign._id,
          actorIdHash,
          impressionAt: { $gte: windowStart, $lte: now },
          served: true,
        });
        if (seenCount < campaign.frequencyCap.maxImpressionsPerActor) uncapped.push(campaign);
      }

      if (uncapped.length === 0) {
        return {
          decisionId,
          ad: null,
          reasonCode: 'frequency_capped',
          latencyMs: Math.max(0, performance.now() - startedAt),
        };
      }

      const withExperiment = uncapped.map((campaign) => {
        const variants = campaign.abTest?.variants ?? [{ key: 'A', weight: 1 }];
        const index = stableVariantIndex(`${campaign.abTest.experimentKey}:${actorRawId}`, variants.length);
        const selectedVariant = variants[index];
        return { campaign, selectedVariant };
      });

      const selectedCampaignEntry =
        pickWeighted(withExperiment.map((entry) => ({ ...entry, weight: Math.max(1, entry.campaign.priority) }))) ||
        null;
      if (!selectedCampaignEntry) {
        return {
          decisionId,
          ad: null,
          reasonCode: 'no_campaign',
          latencyMs: Math.max(0, performance.now() - startedAt),
        };
      }

      if (Math.random() < selectedCampaignEntry.campaign.noFillRate) {
        return {
          decisionId,
          ad: null,
          reasonCode: 'no_fill',
          latencyMs: Math.max(0, performance.now() - startedAt),
        };
      }

      const creatives = await AdCreativeModel.find({
        campaignId: selectedCampaignEntry.campaign._id,
        isActive: true,
        viewType: request.slotContext.viewType,
      }).limit(32);
      const selectedCreative = pickWeighted(creatives);
      if (!selectedCreative) {
        return {
          decisionId,
          ad: null,
          reasonCode: 'creative_missing',
          latencyMs: Math.max(0, performance.now() - startedAt),
        };
      }

      const payload: AdCreativePayload = {
        campaignId: String(selectedCampaignEntry.campaign._id),
        creativeId: String(selectedCreative._id),
        destinationUrl: selectedCreative.destinationUrl,
        viewType: selectedCreative.viewType,
        title: selectedCreative.title,
        bodyText: selectedCreative.bodyText || undefined,
        ctaLabel: selectedCreative.ctaLabel || undefined,
        mediaUrl:
          selectedCreative.mediaSource.type === 'external_url'
            ? selectedCreative.mediaSource.externalUrl
            : selectedCreative.mediaSource.mediaId
              ? `/api/media/${String(selectedCreative.mediaSource.mediaId)}`
              : undefined,
        accessibility: {
          altText: selectedCreative.accessibility.altText,
          ariaLabel: selectedCreative.accessibility.ariaLabel || undefined,
        },
      };

      return {
        decisionId,
        ad: payload,
        reasonCode: 'ok',
        latencyMs: Math.max(0, performance.now() - startedAt),
      };
    } catch {
      return {
        decisionId,
        ad: null,
        reasonCode: 'engine_error',
        latencyMs: Math.max(0, performance.now() - startedAt),
      };
    }
  }
}
