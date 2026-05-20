import { connectMongo, LogModel, ApiRequestMetricModel, ApiRequestErrorEventModel } from '@tdarts/core';
import type { ILog } from '@tdarts/core';
import mongoose from 'mongoose';
import { AdminAuditService } from './admin-audit.service';

const DEFAULT_LOG_LIMIT = 80;
const MAX_LOG_LIMIT = 200;
const DEFAULT_METRIC_LIMIT = 120;
const MAX_METRIC_LIMIT = 200;

const DEFAULT_ERROR_LIMIT = 80;
const MAX_ERROR_LIMIT = 150;

export class AdminObservabilityService {
  static async listLogs(filters: {
    level?: ILog['level'];
    category?: ILog['category'];
    /** When true, only `admin.*` operations (panel audit trail). */
    adminOnly?: boolean;
    /** Staff user who performed the action (`Log.userId`). */
    actorUserId?: string;
    /** Target user id stored in audit metadata (`metadata.targetUserId`). */
    metadataTargetUserId?: string;
    requestId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<Record<string, unknown>[]> {
    await connectMongo();
    const limit = Math.min(filters.limit ?? DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT);
    const skip = Math.max(filters.skip ?? 0, 0);

    const query: Record<string, unknown> = {};
    if (filters.level) query.level = filters.level;
    if (filters.category) query.category = filters.category;
    if (filters.requestId?.trim()) query.requestId = filters.requestId.trim();
    if (filters.adminOnly) query.operation = { $regex: '^admin\\.' };
    if (filters.actorUserId?.trim()) query.userId = filters.actorUserId.trim();
    if (filters.metadataTargetUserId?.trim()) {
      query['metadata.targetUserId'] = filters.metadataTargetUserId.trim();
    }
    if (filters.startDate || filters.endDate) {
      query.timestamp = {} as Record<string, Date>;
      if (filters.startDate) (query.timestamp as { $gte: Date }).$gte = filters.startDate;
      if (filters.endDate) (query.timestamp as { $lte: Date }).$lte = filters.endDate;
    }

    const docs = await LogModel.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
    return docs as Record<string, unknown>[];
  }

  static async listApiRequestMetrics(params?: { limit?: number }): Promise<Record<string, unknown>[]> {
    await connectMongo();
    const limit = Math.min(params?.limit ?? DEFAULT_METRIC_LIMIT, MAX_METRIC_LIMIT);
    const docs = await ApiRequestMetricModel.find({})
      .sort({ bucket: -1 })
      .limit(limit)
      .select(
        'bucket routeKey method source operationClass count errorCount timeoutCount totalDurationMs minDurationMs maxDurationMs',
      )
      .lean();
    return docs as Record<string, unknown>[];
  }

  static async listApiErrorEvents(filters: {
    requestId?: string;
    routeKey?: string;
    isResolved?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<Record<string, unknown>[]> {
    await connectMongo();
    const limit = Math.min(filters.limit ?? DEFAULT_ERROR_LIMIT, MAX_ERROR_LIMIT);
    const skip = Math.max(filters.skip ?? 0, 0);
    const query: Record<string, unknown> = {};
    if (filters.requestId?.trim()) query.requestId = filters.requestId.trim();
    if (filters.routeKey?.trim()) query.routeKey = new RegExp(filters.routeKey.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (typeof filters.isResolved === 'boolean') query.isResolved = filters.isResolved;
    const docs = await ApiRequestErrorEventModel.find(query)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return docs as Record<string, unknown>[];
  }

  static async getApiErrorEventById(id: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ApiRequestErrorEventModel.findById(id).lean();
    return doc as Record<string, unknown> | null;
  }

  /** Aggregated snapshot for observability dashboard (health + charts). */
  static async getDashboardSnapshot(): Promise<{
    timeSeries: { bucket: string; calls: number; errors: number; errorRate: number }[];
    topErrorRoutes: { label: string; errors: number; calls: number }[];
    openErrors: number;
    errors24h: number;
    totalCalls: number;
    overallErrorRate: number;
    recentErrors: { _id: string; routeKey: string; method: string; statusCode: number; occurredAt: string }[];
  }> {
    await connectMongo();
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [metrics, openErrors, errors24h, recentErrors] = await Promise.all([
      AdminObservabilityService.listApiRequestMetrics({ limit: MAX_METRIC_LIMIT }),
      ApiRequestErrorEventModel.countDocuments({ isResolved: { $ne: true } }),
      ApiRequestErrorEventModel.countDocuments({ occurredAt: { $gte: since24 } }),
      ApiRequestErrorEventModel.find({ isResolved: { $ne: true } })
        .sort({ occurredAt: -1 })
        .limit(8)
        .select('routeKey method statusCode occurredAt')
        .lean(),
    ]);

    type Row = { routeKey: string; method: string; count: number; errorCount: number; bucket?: string };
    const rows: Row[] = metrics.map((m) => ({
      routeKey: String(m.routeKey ?? ''),
      method: String(m.method ?? ''),
      count: Number(m.count) || 0,
      errorCount: Number(m.errorCount) || 0,
      bucket:
        m.bucket instanceof Date
          ? m.bucket.toISOString()
          : m.bucket
            ? String(m.bucket)
            : undefined,
    }));

    let totalCalls = 0;
    let totalErrors = 0;
    const byBucket = new Map<string, { calls: number; errors: number }>();
    for (const r of rows) {
      totalCalls += r.count;
      totalErrors += r.errorCount;
      const key = r.bucket?.slice(0, 10) ?? 'unknown';
      const cur = byBucket.get(key) ?? { calls: 0, errors: 0 };
      cur.calls += r.count;
      cur.errors += r.errorCount;
      byBucket.set(key, cur);
    }

    const timeSeries = [...byBucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, v]) => ({
        bucket,
        calls: v.calls,
        errors: v.errors,
        errorRate: v.calls > 0 ? Math.round((v.errors / v.calls) * 1000) / 10 : 0,
      }));

    const routeMap = new Map<string, { errors: number; calls: number; method: string; routeKey: string }>();
    for (const r of rows) {
      const key = `${r.method} ${r.routeKey}`;
      const cur = routeMap.get(key) ?? { errors: 0, calls: 0, method: r.method, routeKey: r.routeKey };
      cur.errors += r.errorCount;
      cur.calls += r.count;
      routeMap.set(key, cur);
    }
    const topErrorRoutes = [...routeMap.values()]
      .filter((r) => r.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 8)
      .map((r) => ({
        label: `${r.method} ${r.routeKey}`.slice(0, 40),
        errors: r.errors,
        calls: r.calls,
      }));

    return {
      timeSeries,
      topErrorRoutes,
      openErrors,
      errors24h,
      totalCalls,
      overallErrorRate: totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 1000) / 10 : 0,
      recentErrors: (recentErrors as Record<string, unknown>[]).map((e) => ({
        _id: String(e._id),
        routeKey: String(e.routeKey ?? ''),
        method: String(e.method ?? ''),
        statusCode: Number(e.statusCode) || 0,
        occurredAt:
          e.occurredAt instanceof Date ? e.occurredAt.toISOString() : new Date().toISOString(),
      })),
    };
  }

  static async resolveApiErrorEvent(actorUserId: string, id: string, resolved: boolean): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid id');
    await ApiRequestErrorEventModel.updateOne(
      { _id: id },
      resolved
        ? { $set: { isResolved: true, resolvedAt: new Date() } }
        : { $set: { isResolved: false }, $unset: { resolvedAt: '' } },
    );
    await AdminAuditService.logAction(actorUserId, 'observability.errorEvent.resolve', { id, resolved });
  }
}
