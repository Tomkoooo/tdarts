import { connectMongo, LogModel, ApiRequestMetricModel } from '@tdarts/core';
import type { ILog } from '@tdarts/core';

const DEFAULT_LOG_LIMIT = 80;
const MAX_LOG_LIMIT = 200;
const DEFAULT_METRIC_LIMIT = 120;
const MAX_METRIC_LIMIT = 200;

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
}
