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
import { sendEmail } from '@/lib/mailer';

type TelemetrySample = {
  routeKey: string;
  method: string;
  sourceType?: 'api' | 'action' | 'page';
  operationClass?: 'read' | 'write' | 'other';
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
  status: number;
  isTimeout?: boolean;
  pageVitals?: {
    ttfbMs?: number;
    fcpMs?: number;
    lcpMs?: number;
    inpMs?: number;
  };
};

type TelemetryErrorEventSample = {
  occurredAt: Date;
  routeKey: string;
  method: string;
  sourceType?: 'api' | 'action' | 'page';
  operationClass?: 'read' | 'write' | 'other';
  status: number;
  isTimeout?: boolean;
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
  sourceType: 'api' | 'action' | 'page';
  operationClass: 'read' | 'write' | 'other';
  count: number;
  errorCount: number;
  timeoutCount: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  durationHistogram: number[];
  totalRequestBytes: number;
  minRequestBytes: number;
  maxRequestBytes: number;
  totalResponseBytes: number;
  minResponseBytes: number;
  maxResponseBytes: number;
  pageLoadMetrics: {
    ttfbTotalMs: number;
    ttfbMinMs: number;
    ttfbMaxMs: number;
    fcpTotalMs: number;
    fcpMinMs: number;
    fcpMaxMs: number;
    lcpTotalMs: number;
    lcpMinMs: number;
    lcpMaxMs: number;
    inpTotalMs: number;
    inpMinMs: number;
    inpMaxMs: number;
    sampleCount: number;
  };
};

const FLUSH_INTERVAL_MS = 60_000;
const ANOMALY_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const ANOMALY_EMAIL_RECIPIENTS = ['toth.tamas@sironic.hu', 'skoda.david@sironic.hu'];
const ANOMALY_DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ANOMALY_REALTIME_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const SIGNAL_THRESHOLD = {
  calls: { activationRatio: 4, recoveryRatio: 1.2 },
  calls_per_sec: { activationRatio: 3, recoveryRatio: 1.2 },
  traffic: { activationRatio: 4, recoveryRatio: 1.2 },
  latency: { activationRatio: 2.2, recoveryRatio: 1.15 },
  error_rate: { activationRatio: 1.8, recoveryRatio: 1.1 },
  packet_size: { activationRatio: 2, recoveryRatio: 1.2 },
  timeouts: { activationRatio: 1.8, recoveryRatio: 1.1 },
} as const;

const MIN_VOLUME_GATES = {
  minCurrentCalls: 50,
  minBaselineCallsPerDay: 20,
  minCallsDelta: 100,
  minCurrentTrafficBytes: 5 * 1024 * 1024,
  minBaselineTrafficBytesPerDay: 2 * 1024 * 1024,
  minTrafficDeltaBytes: 20 * 1024 * 1024,
  minCurrentLatencyMs: 300,
  minLatencyDeltaMs: 200,
  minCurrentErrors: 10,
  minCurrentErrorRate: 0.05,
  minCurrentTimeouts: 10,
  minCurrentAvgPacketBytes: 100 * 1024,
  minPacketDeltaBytes: 64 * 1024,
};

const LATENCY_BUCKET_BOUNDARIES_MS = [50, 100, 200, 300, 500, 800, 1200, 2000, 5000];

function emptyDurationHistogram(): number[] {
  return Array.from({ length: LATENCY_BUCKET_BOUNDARIES_MS.length + 1 }, () => 0);
}

function getDurationBucketIndex(durationMs: number): number {
  for (let i = 0; i < LATENCY_BUCKET_BOUNDARIES_MS.length; i += 1) {
    if (durationMs <= LATENCY_BUCKET_BOUNDARIES_MS[i]) return i;
  }
  return LATENCY_BUCKET_BOUNDARIES_MS.length;
}

function toMinuteBucket(date = new Date()): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

export class ApiTelemetryService {
  private static aggregates = new Map<string, BucketAggregate>();
  private static errorEvents: TelemetryErrorEventSample[] = [];
  private static lastFlushAt = 0;
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
    const sourceType = sample.sourceType || 'api';
    const operationClass = sample.operationClass || 'other';
    const key = `${bucketIso}|${sourceType}|${operationClass}|${sample.method}|${sample.routeKey}`;

    const existing = this.aggregates.get(key);
    if (existing) {
      existing.count += 1;
      existing.errorCount += sample.status >= 400 ? 1 : 0;
      existing.timeoutCount += sample.isTimeout ? 1 : 0;
      existing.totalDurationMs += sample.durationMs;
      existing.minDurationMs = Math.min(existing.minDurationMs, sample.durationMs);
      existing.maxDurationMs = Math.max(existing.maxDurationMs, sample.durationMs);
      existing.durationHistogram[getDurationBucketIndex(sample.durationMs)] += 1;
      existing.totalRequestBytes += sample.requestBytes;
      existing.minRequestBytes = Math.min(existing.minRequestBytes, sample.requestBytes);
      existing.maxRequestBytes = Math.max(existing.maxRequestBytes, sample.requestBytes);
      existing.totalResponseBytes += sample.responseBytes;
      existing.minResponseBytes = Math.min(existing.minResponseBytes, sample.responseBytes);
      existing.maxResponseBytes = Math.max(existing.maxResponseBytes, sample.responseBytes);
      this.mergePageVitals(existing, sample.pageVitals);
    } else {
      const durationHistogram = emptyDurationHistogram();
      durationHistogram[getDurationBucketIndex(sample.durationMs)] = 1;
      const created: BucketAggregate = {
        sourceType,
        operationClass,
        count: 1,
        errorCount: sample.status >= 400 ? 1 : 0,
        timeoutCount: sample.isTimeout ? 1 : 0,
        totalDurationMs: sample.durationMs,
        minDurationMs: sample.durationMs,
        maxDurationMs: sample.durationMs,
        durationHistogram,
        totalRequestBytes: sample.requestBytes,
        minRequestBytes: sample.requestBytes,
        maxRequestBytes: sample.requestBytes,
        totalResponseBytes: sample.responseBytes,
        minResponseBytes: sample.responseBytes,
        maxResponseBytes: sample.responseBytes,
        pageLoadMetrics: {
          ttfbTotalMs: 0,
          ttfbMinMs: Number.MAX_SAFE_INTEGER,
          ttfbMaxMs: 0,
          fcpTotalMs: 0,
          fcpMinMs: Number.MAX_SAFE_INTEGER,
          fcpMaxMs: 0,
          lcpTotalMs: 0,
          lcpMinMs: Number.MAX_SAFE_INTEGER,
          lcpMaxMs: 0,
          inpTotalMs: 0,
          inpMinMs: Number.MAX_SAFE_INTEGER,
          inpMaxMs: 0,
          sampleCount: 0,
        },
      };
      this.mergePageVitals(created, sample.pageVitals);
      this.aggregates.set(key, created);
    }
  }
  private static mergePageVitals(
    target: BucketAggregate,
    pageVitals?: {
      ttfbMs?: number;
      fcpMs?: number;
      lcpMs?: number;
      inpMs?: number;
    }
  ): void {
    if (!pageVitals) return;
    const { ttfbMs, fcpMs, lcpMs, inpMs } = pageVitals;
    const hasAny =
      Number.isFinite(ttfbMs) || Number.isFinite(fcpMs) || Number.isFinite(lcpMs) || Number.isFinite(inpMs);
    if (!hasAny) return;

    if (Number.isFinite(ttfbMs)) {
      const v = Number(ttfbMs);
      target.pageLoadMetrics.ttfbTotalMs += v;
      target.pageLoadMetrics.ttfbMinMs = Math.min(target.pageLoadMetrics.ttfbMinMs, v);
      target.pageLoadMetrics.ttfbMaxMs = Math.max(target.pageLoadMetrics.ttfbMaxMs, v);
    }
    if (Number.isFinite(fcpMs)) {
      const v = Number(fcpMs);
      target.pageLoadMetrics.fcpTotalMs += v;
      target.pageLoadMetrics.fcpMinMs = Math.min(target.pageLoadMetrics.fcpMinMs, v);
      target.pageLoadMetrics.fcpMaxMs = Math.max(target.pageLoadMetrics.fcpMaxMs, v);
    }
    if (Number.isFinite(lcpMs)) {
      const v = Number(lcpMs);
      target.pageLoadMetrics.lcpTotalMs += v;
      target.pageLoadMetrics.lcpMinMs = Math.min(target.pageLoadMetrics.lcpMinMs, v);
      target.pageLoadMetrics.lcpMaxMs = Math.max(target.pageLoadMetrics.lcpMaxMs, v);
    }
    if (Number.isFinite(inpMs)) {
      const v = Number(inpMs);
      target.pageLoadMetrics.inpTotalMs += v;
      target.pageLoadMetrics.inpMinMs = Math.min(target.pageLoadMetrics.inpMinMs, v);
      target.pageLoadMetrics.inpMaxMs = Math.max(target.pageLoadMetrics.inpMaxMs, v);
    }
    target.pageLoadMetrics.sampleCount += 1;
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
        const [bucketIso, sourceType, operationClass, method, routeKey] = key.split('|');
        const bucket = new Date(bucketIso);
        const histogramInc: Record<string, number> = {};
        for (let i = 0; i < agg.durationHistogram.length; i += 1) {
          if (agg.durationHistogram[i] > 0) {
            histogramInc[`durationHistogram.${i}`] = agg.durationHistogram[i];
          }
        }
        return {
          updateOne: {
            filter: { bucket, method, routeKey, source: sourceType, operationClass },
            update: {
              $inc: {
                count: agg.count,
                errorCount: agg.errorCount,
                timeoutCount: agg.timeoutCount,
                totalDurationMs: agg.totalDurationMs,
                totalRequestBytes: agg.totalRequestBytes,
                totalResponseBytes: agg.totalResponseBytes,
                ...histogramInc,
                'pageLoadMetrics.ttfbTotalMs': agg.pageLoadMetrics.ttfbTotalMs,
                'pageLoadMetrics.fcpTotalMs': agg.pageLoadMetrics.fcpTotalMs,
                'pageLoadMetrics.lcpTotalMs': agg.pageLoadMetrics.lcpTotalMs,
                'pageLoadMetrics.inpTotalMs': agg.pageLoadMetrics.inpTotalMs,
                'pageLoadMetrics.sampleCount': agg.pageLoadMetrics.sampleCount,
              },
              $max: {
                maxDurationMs: agg.maxDurationMs,
                maxRequestBytes: agg.maxRequestBytes,
                maxResponseBytes: agg.maxResponseBytes,
                'pageLoadMetrics.ttfbMaxMs': agg.pageLoadMetrics.ttfbMaxMs,
                'pageLoadMetrics.fcpMaxMs': agg.pageLoadMetrics.fcpMaxMs,
                'pageLoadMetrics.lcpMaxMs': agg.pageLoadMetrics.lcpMaxMs,
                'pageLoadMetrics.inpMaxMs': agg.pageLoadMetrics.inpMaxMs,
              },
              $min: {
                minDurationMs: agg.minDurationMs,
                minRequestBytes: agg.minRequestBytes,
                minResponseBytes: agg.minResponseBytes,
                'pageLoadMetrics.ttfbMinMs': agg.pageLoadMetrics.ttfbMinMs,
                'pageLoadMetrics.fcpMinMs': agg.pageLoadMetrics.fcpMinMs,
                'pageLoadMetrics.lcpMinMs': agg.pageLoadMetrics.lcpMinMs,
                'pageLoadMetrics.inpMinMs': agg.pageLoadMetrics.inpMinMs,
              },
              $setOnInsert: {
                bucket,
                method,
                routeKey,
                source: sourceType,
                operationClass,
              },
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
        existing.timeoutCount += value.timeoutCount;
        existing.totalDurationMs += value.totalDurationMs;
        existing.minDurationMs = Math.min(existing.minDurationMs, value.minDurationMs);
        existing.maxDurationMs = Math.max(existing.maxDurationMs, value.maxDurationMs);
        for (let i = 0; i < value.durationHistogram.length; i += 1) {
          existing.durationHistogram[i] = (existing.durationHistogram[i] || 0) + (value.durationHistogram[i] || 0);
        }
        existing.totalRequestBytes += value.totalRequestBytes;
        existing.minRequestBytes = Math.min(existing.minRequestBytes, value.minRequestBytes);
        existing.maxRequestBytes = Math.max(existing.maxRequestBytes, value.maxRequestBytes);
        existing.totalResponseBytes += value.totalResponseBytes;
        existing.minResponseBytes = Math.min(existing.minResponseBytes, value.minResponseBytes);
        existing.maxResponseBytes = Math.max(existing.maxResponseBytes, value.maxResponseBytes);
        existing.pageLoadMetrics.ttfbTotalMs += value.pageLoadMetrics.ttfbTotalMs;
        existing.pageLoadMetrics.ttfbMinMs = Math.min(existing.pageLoadMetrics.ttfbMinMs, value.pageLoadMetrics.ttfbMinMs);
        existing.pageLoadMetrics.ttfbMaxMs = Math.max(existing.pageLoadMetrics.ttfbMaxMs, value.pageLoadMetrics.ttfbMaxMs);
        existing.pageLoadMetrics.fcpTotalMs += value.pageLoadMetrics.fcpTotalMs;
        existing.pageLoadMetrics.fcpMinMs = Math.min(existing.pageLoadMetrics.fcpMinMs, value.pageLoadMetrics.fcpMinMs);
        existing.pageLoadMetrics.fcpMaxMs = Math.max(existing.pageLoadMetrics.fcpMaxMs, value.pageLoadMetrics.fcpMaxMs);
        existing.pageLoadMetrics.lcpTotalMs += value.pageLoadMetrics.lcpTotalMs;
        existing.pageLoadMetrics.lcpMinMs = Math.min(existing.pageLoadMetrics.lcpMinMs, value.pageLoadMetrics.lcpMinMs);
        existing.pageLoadMetrics.lcpMaxMs = Math.max(existing.pageLoadMetrics.lcpMaxMs, value.pageLoadMetrics.lcpMaxMs);
        existing.pageLoadMetrics.inpTotalMs += value.pageLoadMetrics.inpTotalMs;
        existing.pageLoadMetrics.inpMinMs = Math.min(existing.pageLoadMetrics.inpMinMs, value.pageLoadMetrics.inpMinMs);
        existing.pageLoadMetrics.inpMaxMs = Math.max(existing.pageLoadMetrics.inpMaxMs, value.pageLoadMetrics.inpMaxMs);
        existing.pageLoadMetrics.sampleCount += value.pageLoadMetrics.sampleCount;
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
          _id: { sourceType: '$source', routeKey: '$routeKey', method: '$method' },
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
          errors24h: { $sum: { $cond: [{ $gte: ['$bucket', dayAgo] }, '$errorCount', 0] } },
          errorsPrev7d: {
            $sum: {
              $cond: [{ $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] }, '$errorCount', 0],
            },
          },
          count24h: { $sum: { $cond: [{ $gte: ['$bucket', dayAgo] }, '$count', 0] } },
          countPrev7d: {
            $sum: {
              $cond: [{ $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] }, '$count', 0],
            },
          },
          timeout24h: { $sum: { $cond: [{ $gte: ['$bucket', dayAgo] }, '$timeoutCount', 0] } },
          timeoutPrev7d: {
            $sum: {
              $cond: [{ $and: [{ $lt: ['$bucket', dayAgo] }, { $gte: ['$bucket', eightDaysAgo] }] }, '$timeoutCount', 0],
            },
          },
        },
      },
    ]);

    type Candidate = {
      sourceType: 'api' | 'action' | 'page';
      routeKey: string;
      method: string;
      signal: ApiRouteAnomalySignal;
      currentValue: number;
      baselineValue: number;
      ratio: number;
    };

    const keyFor = (x: {
      routeKey: string;
      method: string;
      signal: ApiRouteAnomalySignal;
    }) => `${x.routeKey}|${x.method}|${x.signal}`;

    const existingRows = await ApiRouteAnomalyModel.find({}).lean();
    const existingByKey = new Map(existingRows.map((x) => [keyFor(x as any), x]));
    const desiredActive: Candidate[] = [];
    const newlyActivated: Candidate[] = [];

    for (const row of rows) {
      const sourceType = row._id.sourceType || 'api';
      const routeKey = row._id.routeKey;
      const method = row._id.method;
      const currentCalls = row.calls24h || 0;
      const baselineCalls = (row.callsPrev7d || 0) / 7;
      const currentCallsPerSecond = currentCalls / 86400;
      const baselineCallsPerSecond = baselineCalls / 86400;
      const currentTraffic = row.bytes24h || 0;
      const baselineTraffic = (row.bytesPrev7d || 0) / 7;
      const currentLatency = row.count24h > 0 ? row.duration24h / row.count24h : 0;
      const baselineLatency = row.countPrev7d > 0 ? row.durationPrev7d / row.countPrev7d : 0;
      const currentErrors = row.errors24h || 0;
      const baselineErrorsPerDay = (row.errorsPrev7d || 0) / 7;
      const currentErrorRate = currentCalls > 0 ? currentErrors / currentCalls : 0;
      const baselineErrorRate = row.callsPrev7d > 0 ? (row.errorsPrev7d || 0) / row.callsPrev7d : 0;
      const currentTimeouts = row.timeout24h || 0;
      const baselineTimeouts = (row.timeoutPrev7d || 0) / 7;
      const currentPacketBytes = currentCalls > 0 ? currentTraffic / currentCalls : 0;
      const baselinePacketBytes = baselineCalls > 0 ? baselineTraffic / baselineCalls : 0;

      const evaluateSignal = (
        signal: ApiRouteAnomalySignal,
        currentValue: number,
        baselineValue: number,
        activationEligible: boolean,
        recoveryEligible: boolean
      ) => {
        if (baselineValue <= 0) return;
        const ratio = currentValue / baselineValue;
        const key = keyFor({ routeKey, method, signal });
        const existingRow = existingByKey.get(key);
        const thresholds = SIGNAL_THRESHOLD[signal];
        const shouldActivate = activationEligible && ratio >= thresholds.activationRatio;
        const shouldStayActive = Boolean(existingRow?.isActive && recoveryEligible && ratio >= thresholds.recoveryRatio);

        if (!shouldActivate && !shouldStayActive) return;

        const candidate: Candidate = { sourceType, routeKey, method, signal, currentValue, baselineValue, ratio };
        desiredActive.push(candidate);
        if (!existingRow?.isActive) {
          newlyActivated.push(candidate);
        }
      };

      evaluateSignal(
        'calls_per_sec',
        currentCallsPerSecond,
        baselineCallsPerSecond,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay
      );

      evaluateSignal(
        'calls',
        currentCalls,
        baselineCalls,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls &&
          baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay &&
          currentCalls - baselineCalls >= MIN_VOLUME_GATES.minCallsDelta,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay
      );

      evaluateSignal(
        'traffic',
        currentTraffic,
        baselineTraffic,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls &&
          baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay &&
          currentTraffic >= MIN_VOLUME_GATES.minCurrentTrafficBytes &&
          baselineTraffic >= MIN_VOLUME_GATES.minBaselineTrafficBytesPerDay &&
          currentTraffic - baselineTraffic >= MIN_VOLUME_GATES.minTrafficDeltaBytes,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay
      );

      evaluateSignal(
        'latency',
        currentLatency,
        baselineLatency,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls &&
          baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay &&
          currentLatency >= MIN_VOLUME_GATES.minCurrentLatencyMs &&
          currentLatency - baselineLatency >= MIN_VOLUME_GATES.minLatencyDeltaMs,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay
      );

      evaluateSignal(
        'error_rate',
        currentErrorRate,
        baselineErrorRate,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls &&
          currentErrors >= MIN_VOLUME_GATES.minCurrentErrors &&
          currentErrorRate >= MIN_VOLUME_GATES.minCurrentErrorRate &&
          baselineErrorsPerDay >= 1,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls &&
          currentErrors >= MIN_VOLUME_GATES.minCurrentErrors &&
          currentErrorRate >= MIN_VOLUME_GATES.minCurrentErrorRate
      );

      evaluateSignal(
        'packet_size',
        currentPacketBytes,
        baselinePacketBytes,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls &&
          baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay &&
          currentPacketBytes >= MIN_VOLUME_GATES.minCurrentAvgPacketBytes &&
          currentPacketBytes - baselinePacketBytes >= MIN_VOLUME_GATES.minPacketDeltaBytes,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && baselineCalls >= MIN_VOLUME_GATES.minBaselineCallsPerDay
      );

      evaluateSignal(
        'timeouts',
        currentTimeouts,
        baselineTimeouts,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && currentTimeouts >= MIN_VOLUME_GATES.minCurrentTimeouts,
        currentCalls >= MIN_VOLUME_GATES.minCurrentCalls && currentTimeouts >= MIN_VOLUME_GATES.minCurrentTimeouts
      );
    }

    const desiredKeys = new Set(desiredActive.map((x) => keyFor(x)));

    for (const anomaly of desiredActive) {
      await ApiRouteAnomalyModel.updateOne(
        {
          routeKey: anomaly.routeKey,
          method: anomaly.method,
          signal: anomaly.signal,
        },
        {
          $set: {
            sourceType: anomaly.sourceType,
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

    if (desiredKeys.size > 0) {
      await ApiRouteAnomalyModel.updateMany(
        {
          isActive: true,
          $nor: desiredActive.map((x) => ({
            routeKey: x.routeKey,
            method: x.method,
            signal: x.signal,
          })),
        },
        { $set: { isActive: false, lastObservedAt: now } }
      );
    } else {
      await ApiRouteAnomalyModel.updateMany({ isActive: true }, { $set: { isActive: false, lastObservedAt: now } });
    }

    const realtimeDue = newlyActivated.filter((x) => {
      const existingRow = existingByKey.get(keyFor(x));
      if (!existingRow?.lastRealtimeEmailAt) return true;
      return now.getTime() - new Date(existingRow.lastRealtimeEmailAt).getTime() >= ANOMALY_REALTIME_COOLDOWN_MS;
    });

    if (realtimeDue.length > 0) {
      await sendEmail({
        to: ANOMALY_EMAIL_RECIPIENTS,
        subject: '[tDarts] API anomaly detected (24h vs 7d)',
        text: [
          'New API anomalies were detected:',
          ...realtimeDue.map((a) => {
            const unit =
              a.signal === 'latency'
                ? 'ms'
                : a.signal === 'error_rate'
                  ? '%'
                  : a.signal === 'calls' || a.signal === 'timeouts'
                    ? 'count'
                    : a.signal === 'calls_per_sec'
                      ? 'rps'
                      : 'bytes';
            const currentValue = a.signal === 'error_rate' ? a.currentValue * 100 : a.currentValue;
            const baselineValue = a.signal === 'error_rate' ? a.baselineValue * 100 : a.baselineValue;
            return `- [${a.sourceType}] ${a.method} ${a.routeKey} | ${a.signal}: ${currentValue.toFixed(2)} ${unit} vs baseline ${baselineValue.toFixed(2)} (${a.ratio.toFixed(2)}x)`;
          }),
          `Detected at: ${now.toISOString()}`,
        ].join('\n'),
      });

      await ApiRouteAnomalyModel.updateMany(
        {
          $or: realtimeDue.map((x) => ({
            routeKey: x.routeKey,
            method: x.method,
            signal: x.signal,
          })),
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
            const unit =
              a.signal === 'latency'
                ? 'ms'
                : a.signal === 'error_rate'
                  ? '%'
                  : a.signal === 'calls' || a.signal === 'timeouts'
                    ? 'count'
                    : a.signal === 'calls_per_sec'
                      ? 'rps'
                      : 'bytes';
            const currentValue = a.signal === 'error_rate' ? a.currentValue * 100 : a.currentValue;
            const baselineValue = a.signal === 'error_rate' ? a.baselineValue * 100 : a.baselineValue;
            return `- [${a.sourceType}] ${a.method} ${a.routeKey} | ${a.signal}: ${currentValue.toFixed(2)} ${unit} vs baseline ${baselineValue.toFixed(2)} (${a.ratio.toFixed(2)}x)`;
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
