import { connectMongo } from '@tdarts/core';
import { AdDeliveryLogModel, AdInteractionEventModel, AdMetricsAggHourlyModel } from '@tdarts/core';

export type RecordImpressionInput = {
  campaignId?: string;
  creativeId?: string;
  slotId: string;
  placementKey: string;
  actorType: 'user' | 'session';
  actorIdHash: string;
  sessionId: string;
  served: boolean;
  noFillReason?: string;
  decisionLatencyMs: number;
  impressionAt: Date;
  decisionId: string;
};

export type RecordInteractionInput = {
  campaignId: string;
  creativeId: string;
  eventType: 'click' | 'hover' | 'mouseenter' | 'dismiss' | 'viewability';
  actorType: 'user' | 'session';
  actorIdHash: string;
  sessionId: string;
  pagePath: string;
  eventAt: Date;
  metadata?: Record<string, unknown>;
};

function bucketHour(date: Date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

export class AdTelemetryService {
  static async recordImpression(input: RecordImpressionInput) {
    await connectMongo();
    const row = await AdDeliveryLogModel.create(input);

    const hourBucket = bucketHour(input.impressionAt);
    await AdMetricsAggHourlyModel.updateOne(
      {
        hourBucket,
        campaignId: input.campaignId || null,
        creativeId: input.creativeId || null,
        slotId: input.slotId,
        eventType: 'impression',
      },
      {
        $inc: { impressions: input.served ? 1 : 0 },
        $setOnInsert: { clicks: 0, interactions: 0, uniqueActors: 0, avgDecisionLatencyMs: 0, avgRenderMs: 0 },
      },
      { upsert: true }
    );

    return row;
  }

  static async recordInteraction(input: RecordInteractionInput) {
    await connectMongo();
    const event = await AdInteractionEventModel.create(input);

    const hourBucket = bucketHour(input.eventAt);
    await AdMetricsAggHourlyModel.updateOne(
      {
        hourBucket,
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        slotId: 'unknown',
        eventType: input.eventType,
      },
      {
        $inc: {
          clicks: input.eventType === 'click' ? 1 : 0,
          interactions: input.eventType === 'click' ? 0 : 1,
        },
        $setOnInsert: { impressions: 0, uniqueActors: 0, avgDecisionLatencyMs: 0, avgRenderMs: 0 },
      },
      { upsert: true }
    );
    return event;
  }

  static async getTelemetrySummary(params: { start?: Date; end?: Date }) {
    await connectMongo();
    const startDate = params.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = params.end || new Date();

    const [totals, trend] = await Promise.all([
      AdMetricsAggHourlyModel.aggregate([
        { $match: { hourBucket: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            impressions: { $sum: '$impressions' },
            clicks: { $sum: '$clicks' },
            interactions: { $sum: '$interactions' },
            uniqueActors: { $sum: '$uniqueActors' },
            avgDecisionLatencyMs: { $avg: '$avgDecisionLatencyMs' },
          },
        },
      ]),
      AdMetricsAggHourlyModel.aggregate([
        { $match: { hourBucket: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$hourBucket', impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' }, interactions: { $sum: '$interactions' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const row = totals[0] || {};
    const impressions = Number(row.impressions || 0);
    const clicks = Number(row.clicks || 0);
    return {
      summary: {
        impressions,
        clicks,
        interactions: Number(row.interactions || 0),
        uniqueActors: Number(row.uniqueActors || 0),
        ctr: impressions > 0 ? clicks / impressions : 0,
        avgDecisionLatencyMs: Number(row.avgDecisionLatencyMs || 0),
      },
      trend: trend.map((p: any) => ({
        bucketAt: p._id,
        impressions: Number(p.impressions || 0),
        clicks: Number(p.clicks || 0),
        interactions: Number(p.interactions || 0),
      })),
    };
  }
}
