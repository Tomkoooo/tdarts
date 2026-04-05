import mongoose, { Document, Schema } from 'mongoose';

export interface IApiRequestErrorReset extends Document {
  routeKey: string;
  method: string;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiRequestErrorResetSchema = new Schema<IApiRequestErrorReset>(
  {
    routeKey: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true, default: 'ALL' },
    resetAt: { type: Date, required: true, index: true },
  },
  {
    collection: 'api_request_error_resets',
    timestamps: true,
  }
);

ApiRequestErrorResetSchema.index({ routeKey: 1, method: 1 }, { unique: true });
ApiRequestErrorResetSchema.index({ routeKey: 1, resetAt: -1 });

export const ApiRequestErrorResetModel =
  mongoose.models.ApiRequestErrorReset ||
  mongoose.model<IApiRequestErrorReset>('ApiRequestErrorReset', ApiRequestErrorResetSchema);
