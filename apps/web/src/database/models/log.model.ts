import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  level: 'error' | 'warn' | 'info' | 'debug';
  category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database';
  message: string;
  errorType?: string;
  errorCode?: string;
  expected?: boolean;
  operation?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  httpStatus?: number;
  error?: string;
  stack?: string;
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
  timestamp: Date;
  metadata?: Record<string, any>;
}

const LogSchema = new Schema<ILog>({
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    required: true,
    default: 'error'
  },
  category: {
    type: String,
    enum: ['auth', 'club', 'tournament', 'player', 'user', 'api', 'system', 'database'],
    required: true,
    default: 'system'
  },
  message: {
    type: String,
    required: true
  },
  errorType: {
    type: String
  },
  errorCode: {
    type: String
  },
  expected: {
    type: Boolean,
    default: false
  },
  operation: {
    type: String
  },
  entityType: {
    type: String
  },
  entityId: {
    type: String
  },
  requestId: {
    type: String
  },
  httpStatus: {
    type: Number
  },
  error: {
    type: String
  },
  stack: {
    type: String
  },
  userId: {
    type: String
  },
  userRole: {
    type: String
  },
  clubId: {
    type: String
  },
  tournamentId: {
    type: String
  },
  playerId: {
    type: String
  },
  endpoint: {
    type: String
  },
  method: {
    type: String
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  requestBody: {
    type: Schema.Types.Mixed
  },
  responseStatus: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
LogSchema.index({ timestamp: -1 });
LogSchema.index({ level: 1 });
LogSchema.index({ category: 1 });
LogSchema.index({ userId: 1 });
LogSchema.index({ clubId: 1 });
LogSchema.index({ expected: 1 });
LogSchema.index({ errorCode: 1 });
LogSchema.index({ operation: 1 });
LogSchema.index({ entityType: 1, entityId: 1 });
LogSchema.index({ requestId: 1 });

export const LogModel = mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);
