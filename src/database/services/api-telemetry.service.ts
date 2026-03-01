import { connectMongo } from '@/lib/mongoose';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import {
  ApiErrorEventSource,
  ApiRequestErrorEventModel,
} from '@/database/models/api-request-error-event.model';
import {
  ApiRouteAnomalySignal,
  ApiRouteAnomalyModel,
} from '@/database/models/api-route-anomaly.model';
import { ErrorService } from '@/database/services/error.service';
import { sendEmail } from '@/lib/mailer';

type TelemetrySample = {
  routeKey: string;
  method: string;
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
  status: number;
};

type TelemetryErrorEventSample = {
  occurredAt: Date;
  routeKey: string;
  method: string;
  status: number;
  requestId?: string;
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestQuery?: Record<string, string | string[]>;
  requestBody?: string;
  responseBody?: string;
  contentType?: string;
  errorMessage?: string;
  source: ApiErrorEventSource;
  requestBodyTruncated?: boolean;
  responseBodyTruncated?: boolean;
};

type BucketAggregate = {
  count: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  totalRequestBytes: number;
  maxRequestBytes: number;
  totalResponseBytes: number;
  maxResponseBytes: number;
};

const FLUSH_INTERVAL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const ERROR_EVENT_RETENTION_DAYS = 30;
const ANOMALY_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const ANOMALY_RATIO_THRESHOLD = 2;
const ANOMALY_EMAIL_RECIPIENTS = ['toth.tamas@sironic.hu', 'skoda.david@sironic.hu'];
const ANOMALY_DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;

function toMinuteBucket(date = new Date()): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

export class ApiTelemetryService {
  private static aggregates = new Map<string, BucketAggregate>();
  private static errorEvents: TelemetryErrorEventSample[] = [];
  private static lastFlushAt = 0;
  private static lastCleanupAt = 0;
  private static lastAnomalyCheckAt = 0;
  private static isFlushInProgress = false;

  static normalizeRouteKey(pathname: string): string {
    if (!pathname) return '/api/unknown';

    return pathname
      .replace(/[0-9a-fA-F]{24}/g, '[id]')
      .replace(/[0-9]{2,}/g, '[id]')
      .replace(/\/[A-Z0-9]{4,}(?=\/|$)/g, '/[code]');
  }

  static record(sample: TelemetrySample): void {
    const bucketIso = toMinuteBucket().toISOString();
    const key = `${bucketIso}|${sample.method}|${sample.routeKey}`;

    const existing = this.aggregates.get(key);
    if (existing) {
      existing.count += 1;
      existing.errorCount += sample.status >= 400 ? 1 : 0;
      existing.totalDurationMs += sample.durationMs;
      existing.maxDurationMs = Math.max(existing.maxDurationMs, sample.durationMs);
      existing.totalRequestBytes += sample.requestBytes;
      existing.maxRequestBytes = Math.max(existing.maxRequestBytes, sample.requestBytes);
      existing.totalResponseBytes += sample.responseBytes;
      existing.maxResponseBytes = Math.max(existing.maxResponseBytes, sample.responseBytes);
    } else {
      this.aggregates.set(key, {
        count: 1,
        errorCount: sample.status >= 400 ? 1 : 0,
        totalDurationMs: sample.durationMs,
        maxDurationMs: sample.durationMs,
        totalRequestBytes: sample.requestBytes,
        maxRequestBytes: sample.requestBytes,
        totalResponseBytes: sample.responseBytes,
        maxResponseBytes: sample.responseBytes,
      });
    }
  }

  static recordErrorEvent(sample: TelemetryErrorEventSample): void {
    this.errorEvents.push(sample);
  }

  static scheduleFlushIfNeeded(): void {
    const now = Date.now();
    if (this.isFlushInProgress) return;
    if (now - this.lastFlushAt < FLUSH_INTERVAL_MS) return;
    this.lastFlushAt = now;

    setTimeout(() => {
      this.flush().catch((error) => {
        console.error('ApiTelemetryService flush failed:', error);
      });
    }, 0);
  }

  static async flush(): Promise<number> {
    if (this.isFlushInProgress) return 0;
    if (this.aggregates.size === 0 && this.errorEvents.length === 0) return 0;

    this.isFlushInProgress = true;

    const snapshot = this.aggregates;
    this.aggregates = new Map<string, BucketAggregate>();
    const errorEventsSnapshot = this.errorEvents;
    this.errorEvents = [];

    try {
      await connectMongo();

      const operations = Array.from(snapshot.entries()).map(([key, agg]) => {
        const [bucketIso, method, routeKey] = key.split('|');
        const bucket = new Date(bucketIso);
        return {
          updateOne: {
            filter: { bucket, method, routeKey },
            update: {
              $inc: {
                count: agg.count,
                errorCount: agg.errorCount,
                totalDurationMs: agg.totalDurationMs,
                totalRequestBytes: agg.totalRequestBytes,
                totalResponseBytes: agg.totalResponseBytes,
              },
              $max: {
                maxDurationMs: agg.maxDurationMs,
                maxRequestBytes: agg.maxRequestBytes,
                maxResponseBytes: agg.maxResponseBytes,
              },
              $setOnInsert: { bucket, method, routeKey },
            },
            upsert: true,
          },
        };
      });

      if (operations.length > 0) {
        await ApiRequestMetricModel.bulkWrite(operations, { ordered: false });
      }

      if (errorEventsSnapshot.length > 0) {
        await ApiRequestErrorEventModel.insertMany(errorEventsSnapshot, { ordered: false });
      }

      const now = Date.now();
      if (now - this.lastCleanupAt > CLEANUP_INTERVAL_MS) {
        this.lastCleanupAt = now;
        const cutoff = new Date(now - ERROR_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const cleanupResult = await ApiRequestErrorEventModel.deleteMany({ occurredAt: { $lt: cutoff } });
        await ErrorService.logInfo('API telemetry error-event retention cleanup completed', 'api', {
          operation: 'api_telemetry_error_event_retention_cleanup',
          endpoint: '/api/internal/telemetry/flush',
          metadata: {
            deletedCount: cleanupResult.deletedCount || 0,
            retentionDays: ERROR_EVENT_RETENTION_DAYS,
            cutoffIso: cutoff.toISOString(),
          },
        });
      }

      if (now - this.lastAnomalyCheckAt > ANOMALY_CHECK_INTERVAL_MS) {
        this.lastAnomalyCheckAt = now;
        await this.detectAndNotifyRouteAnomalies();
      }

      return operations.length + errorEventsSnapshot.length;
    } catch (error) {
      // Put snapshot back so we don't lose metrics.
      for (const [key, value] of snapshot.entries()) {
        const existing = this.aggregates.get(key);
        if (!existing) {
          this.aggregates.set(key, value);
          continue;
        }
        existing.count += value.count;
        existing.errorCount += value.errorCount;
        existing.totalDurationMs += value.totalDurationMs;
        existing.maxDurationMs = Math.max(existing.maxDurationMs, value.maxDurationMs);
        existing.totalRequestBytes += value.totalRequestBytes;
        existing.maxRequestBytes = Math.max(existing.maxRequestBytes, value.maxRequestBytes);
        existing.totalResponseBytes += value.totalResponseBytes;
        existing.maxResponseBytes = Math.max(existing.maxResponseBytes, value.maxResponseBytes);
      }
      this.errorEvents.unshift(...errorEventsSnapshot);
      throw error;
    } finally {
      this.isFlushInProgress = false;
    }
  }

  private static async detectAndNotifyRouteAnomalies(): Promise<void> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    const rows = await ApiRequestMetricModel.aggregate([
      { $match: { bucket: { $gte: eightDaysAgo, $lte: now } } },
      {
        $group: {
          _id: { routeKey: '$routeKey', method: '$method' },
          calls24h: { $sum: { $cond: [{ $gte: ['$bucket', dayAgo] }, '$count', 0] } },
          callsPrev7d: {
            $sum: {
              $cond: [{ $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] }, '$count', 0],
            },
          },
          bytes24h: {
            $sum: {
              $cond: [
                { $gte: ['$bucket', dayAgo] },
                { $add: ['$totalRequestBytes', '$totalResponseBytes'] },
                0,
              ],
            },
          },
          bytesPrev7d: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] },
                { $add: ['$totalRequestBytes', '$totalResponseBytes'] },
                0,
              ],
            },
          },
          duration24h: { $sum: { $cond: [{ $gte: ['$bucket', dayAgo] }, '$totalDurationMs', 0] } },
          durationPrev7d: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] },
                '$totalDurationMs',
                0,
              ],
            },
          },
          count24h: { $sum: { $cond: [{ $gte: ['$bucket', dayAgo] }, '$count', 0] } },
          countPrev7d: {
            $sum: {
              $cond: [{ $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] }, '$count', 0],
            },
          },
        },
      },
    ]);

    type Candidate = {
      routeKey: string;
      method: string;
      signal: ApiRouteAnomalySignal;
      currentValue: number;
      baselineValue: number;
      ratio: number;
    };

    const candidates: Candidate[] = [];
    for (const row of rows) {
      const baselineCalls = (row.callsPrev7d || 0) / 7;
      const baselineTraffic = (row.bytesPrev7d || 0) / 7;
      const currentLatency = row.count24h > 0 ? row.duration24h / row.count24h : 0;
      const baselineLatency = row.countPrev7d > 0 ? row.durationPrev7d / row.countPrev7d : 0;

      const routeKey = row._id.routeKey;
      const method = row._id.method;

      const maybePush = (signal: ApiRouteAnomalySignal, currentValue: number, baselineValue: number) => {
        if (baselineValue <= 0) return;
        const ratio = currentValue / baselineValue;
        if (ratio > ANOMALY_RATIO_THRESHOLD) {
          candidates.push({ routeKey, method, signal, currentValue, baselineValue, ratio });
        }
      };

      maybePush('calls', row.calls24h || 0, baselineCalls);
      maybePush('traffic', row.bytes24h || 0, baselineTraffic);
      maybePush('latency', currentLatency, baselineLatency);
    }

    const keyFor = (x: { routeKey: string; method: string; signal: ApiRouteAnomalySignal }) =>
      `${x.routeKey}|${x.method}|${x.signal}`;
    const candidateKeys = new Set(candidates.map((x) => keyFor(x)));

    const existing = candidateKeys.size
      ? await ApiRouteAnomalyModel.find({
          $or: candidates.map((x) => ({ routeKey: x.routeKey, method: x.method, signal: x.signal })),
        }).lean()
      : [];
    const existingByKey = new Map(existing.map((x) => [keyFor(x as any), x]));
    const newlyActivated: Candidate[] = [];

    for (const anomaly of candidates) {
      const key = keyFor(anomaly);
      const existingRow = existingByKey.get(key);
      if (!existingRow || !existingRow.isActive) {
        newlyActivated.push(anomaly);
      }

      await ApiRouteAnomalyModel.updateOne(
        { routeKey: anomaly.routeKey, method: anomaly.method, signal: anomaly.signal },
        {
          $set: {
            currentValue: anomaly.currentValue,
            baselineValue: anomaly.baselineValue,
            ratio: anomaly.ratio,
            isActive: true,
            lastDetectedAt: now,
            lastObservedAt: now,
          },
          $setOnInsert: { firstDetectedAt: now },
        },
        { upsert: true }
      );
    }

    if (candidateKeys.size > 0) {
      await ApiRouteAnomalyModel.updateMany(
        {
          isActive: true,
          $nor: candidates.map((x) => ({ routeKey: x.routeKey, method: x.method, signal: x.signal })),
        },
        { $set: { isActive: false, lastObservedAt: now } }
      );
    } else {
      await ApiRouteAnomalyModel.updateMany({ isActive: true }, { $set: { isActive: false, lastObservedAt: now } });
    }

    if (newlyActivated.length > 0) {
      await sendEmail({
        to: ANOMALY_EMAIL_RECIPIENTS,
        subject: '[tDarts] API anomaly detected (24h vs 7d)',
        text: [
          'New API anomalies were detected:',
          ...newlyActivated.map((a) => {
            const unit = a.signal === 'traffic' ? 'bytes' : a.signal === 'latency' ? 'ms' : 'calls';
            return `- ${a.method} ${a.routeKey} | ${a.signal}: ${a.currentValue.toFixed(2)} ${unit} vs baseline ${a.baselineValue.toFixed(2)} (${a.ratio.toFixed(2)}x)`;
          }),
          `Detected at: ${now.toISOString()}`,
        ].join('\n'),
      });

      await ApiRouteAnomalyModel.updateMany(
        {
          $or: newlyActivated.map((x) => ({ routeKey: x.routeKey, method: x.method, signal: x.signal })),
        },
        { $set: { lastRealtimeEmailAt: now } }
      );
    }

    const digestDue = await ApiRouteAnomalyModel.find({
      isActive: true,
      $or: [{ lastDigestEmailAt: { $exists: false } }, { lastDigestEmailAt: { $lt: new Date(now.getTime() - ANOMALY_DIGEST_INTERVAL_MS) } }],
    })
      .sort({ ratio: -1 })
      .limit(50)
      .lean();

    if (digestDue.length > 0) {
      await sendEmail({
        to: ANOMALY_EMAIL_RECIPIENTS,
        subject: '[tDarts] Daily API anomaly digest',
        text: [
          'Active API anomalies (daily digest):',
          ...digestDue.map((a) => {
            const unit = a.signal === 'traffic' ? 'bytes' : a.signal === 'latency' ? 'ms' : 'calls';
            return `- ${a.method} ${a.routeKey} | ${a.signal}: ${a.currentValue.toFixed(2)} ${unit} vs baseline ${a.baselineValue.toFixed(2)} (${a.ratio.toFixed(2)}x)`;
          }),
          `Generated at: ${now.toISOString()}`,
        ].join('\n'),
      });
      await ApiRouteAnomalyModel.updateMany(
        { _id: { $in: digestDue.map((x) => x._id) } },
        { $set: { lastDigestEmailAt: now } }
      );
    }
  }
}
