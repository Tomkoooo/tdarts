import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  level: 'error' | 'warn' | 'info' | 'debug';
  category: 'auth' | 'club' | 'tournament' | 'player' | 'user' | 'api' | 'system' | 'database';
  message: string;
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

export const LogModel = mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);
