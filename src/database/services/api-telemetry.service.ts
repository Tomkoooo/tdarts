import { connectMongo } from '@/lib/mongoose';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';

type TelemetrySample = {
  routeKey: string;
  method: string;
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
  status: number;
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

function toMinuteBucket(date = new Date()): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

export class ApiTelemetryService {
  private static aggregates = new Map<string, BucketAggregate>();
  private static lastFlushAt = 0;
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
    if (this.aggregates.size === 0) return 0;

    this.isFlushInProgress = true;

    const snapshot = this.aggregates;
    this.aggregates = new Map<string, BucketAggregate>();

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

      return operations.length;
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
      throw error;
    } finally {
      this.isFlushInProgress = false;
    }
  }
}
