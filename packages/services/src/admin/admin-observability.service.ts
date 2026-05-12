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
