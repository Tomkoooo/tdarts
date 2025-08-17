import { connectMongo } from '@/lib/mongoose';
import { LogModel, ILog } from '../models/log.model';

export interface LogContext {
  userId?: string;
  userRole?: string;
  clubId?: string;
  tournamentId?: string;
  playerId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  requestBody?: any;
  responseStatus?: number;
  metadata?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export class ErrorService {
  static async logError(
    message: string,
    error?: Error | string,
    category: ILog['category'] = 'system',
    context?: LogContext
  ): Promise<void> {
    try {
      await connectMongo();
      
      const logData: Partial<ILog> = {
        level: 'error',
        category,
        message,
        timestamp: new Date(),
        ...context
      };

      if (error) {
        if (typeof error === 'string') {
          logData.error = error;
        } else {
          logData.error = error.message;
          logData.stack = error.stack;
        }
      }

      await LogModel.create(logData);
    } catch (logError) {
      // Fallback to console if database logging fails
      console.error('Failed to log error to database:', logError);
      console.error('Original error:', message, error);
    }
  }

  static async logWarning(
    message: string,
    category: ILog['category'] = 'system',
    context?: LogContext
  ): Promise<void> {
    try {
      await connectMongo();
      
      const logData: Partial<ILog> = {
        level: 'warn',
        category,
        message,
        timestamp: new Date(),
        ...context
      };

      await LogModel.create(logData);
    } catch (logError) {
      console.warn('Failed to log warning to database:', logError);
      console.warn('Original warning:', message);
    }
  }

  static async logInfo(
    message: string,
    category: ILog['category'] = 'system',
    context?: LogContext
  ): Promise<void> {
    try {
      await connectMongo();
      
      const logData: Partial<ILog> = {
        level: 'info',
        category,
        message,
        timestamp: new Date(),
        ...context
      };

      await LogModel.create(logData);
    } catch (logError) {
      console.info('Failed to log info to database:', logError);
      console.info('Original info:', message);
    }
  }

  static async logDebug(
    message: string,
    category: ILog['category'] = 'system',
    context?: LogContext
  ): Promise<void> {
    try {
      await connectMongo();
      
      const logData: Partial<ILog> = {
        level: 'debug',
        category,
        message,
        timestamp: new Date(),
        ...context
      };

      await LogModel.create(logData);
    } catch (logError) {
      console.debug('Failed to log debug to database:', logError);
      console.debug('Original debug:', message);
    }
  }

  static async getLogs(
    filters: {
      level?: ILog['level'];
      category?: ILog['category'];
      userId?: string;
      clubId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<ILog[]> {
    try {
      await connectMongo();
      
      const query: any = {};
      
      if (filters.level) query.level = filters.level;
      if (filters.category) query.category = filters.category;
      if (filters.userId) query.userId = filters.userId;
      if (filters.clubId) query.clubId = filters.clubId;
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const logs = await LogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(filters.limit || 100)
        .skip(filters.skip || 0)
        .lean();

      return logs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  static async getErrorStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByLevel: Record<string, number>;
    recentErrors: ILog[];
  }> {
    try {
      await connectMongo();
      
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = startDate;
        if (endDate) dateFilter.timestamp.$lte = endDate;
      }

      const [totalErrors, errorsByCategory, errorsByLevel, recentErrors] = await Promise.all([
        LogModel.countDocuments({ level: 'error', ...dateFilter }),
        LogModel.aggregate([
          { $match: { level: 'error', ...dateFilter } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        LogModel.aggregate([
          { $match: { level: 'error', ...dateFilter } },
          { $group: { _id: '$level', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        LogModel.find({ level: 'error', ...dateFilter })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean()
      ]);

      return {
        totalErrors,
        errorsByCategory: errorsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        errorsByLevel: errorsByLevel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentErrors
      };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByCategory: {},
        errorsByLevel: {},
        recentErrors: []
      };
    }
  }
}
