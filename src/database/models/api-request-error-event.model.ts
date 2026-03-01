import mongoose, { Document, Schema } from 'mongoose';

export type ApiErrorEventSource = 'http_status' | 'exception';

export interface IApiRequestErrorEvent extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const ApiRequestErrorEventSchema = new Schema<IApiRequestErrorEvent>(
  {
    occurredAt: { type: Date, required: true, index: true },
    routeKey: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true },
    status: { type: Number, required: true, index: true },
    requestId: { type: String },
    durationMs: { type: Number, required: true, default: 0 },
    requestBytes: { type: Number, required: true, default: 0 },
    responseBytes: { type: Number, required: true, default: 0 },
    requestHeaders: { type: Schema.Types.Mixed },
    responseHeaders: { type: Schema.Types.Mixed },
    requestQuery: { type: Schema.Types.Mixed },
    requestBody: { type: String },
    responseBody: { type: String },
    contentType: { type: String },
    errorMessage: { type: String },
    source: {
      type: String,
      enum: ['http_status', 'exception'],
      required: true,
      index: true,
    },
    requestBodyTruncated: { type: Boolean, default: false },
    responseBodyTruncated: { type: Boolean, default: false },
  },
  {
    collection: 'api_request_error_events',
    timestamps: true,
  }
);

ApiRequestErrorEventSchema.index({ routeKey: 1, method: 1, occurredAt: -1 });
ApiRequestErrorEventSchema.index({ status: 1, occurredAt: -1 });

export const ApiRequestErrorEventModel =
  mongoose.models.ApiRequestErrorEvent ||
  mongoose.model<IApiRequestErrorEvent>('ApiRequestErrorEvent', ApiRequestErrorEventSchema);
