import type { Model } from 'mongoose';

/**
 * Singleton document holding global runtime toggles that used to live in
 * `NEXT_PUBLIC_ENABLE_*` env vars. Toggles take effect immediately because
 * we read them at request time (with a short in-process cache) instead of
 * baking them into the client bundle at build time.
 *
 * Model registration is **lazy**: some hosts (e.g. Next.js bundling) can evaluate
 * this module before a valid `mongoose` default export exists. We only touch
 * `mongoose.models` after `getSystemSettingsModel()` runs on the server.
 */

export const SYSTEM_SETTINGS_SINGLETON_ID = 'global' as const;

export type FeatureToggleKey =
  | 'LEAGUES'
  | 'SOCKET'
  | 'LIVE_MATCH_FOLLOWING'
  | 'DETAILED_STATISTICS'
  | 'ADVANCED_STATISTICS'
  | 'OAC_CREATION'
  | 'ADS'
  | 'ADS_PLACEHOLDER';

export const FEATURE_TOGGLE_KEYS: FeatureToggleKey[] = [
  'LEAGUES',
  'SOCKET',
  'LIVE_MATCH_FOLLOWING',
  'DETAILED_STATISTICS',
  'ADVANCED_STATISTICS',
  'OAC_CREATION',
  'ADS',
  'ADS_PLACEHOLDER',
];

export type FeatureTogglesMap = Record<FeatureToggleKey, boolean>;

export interface SystemSettingsDocument {
  _id: string;
  features: FeatureTogglesMap;
  subscriptionPaywallEnabled: boolean;
  superAdminBypassEnabled: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

type MongooseModule = typeof import('mongoose');

let cachedModel: Model<SystemSettingsDocument> | undefined;

/** Returns the compiled Mongoose model (creates it on first use). */
export function getSystemSettingsModel(): Model<SystemSettingsDocument> {
  if (cachedModel) return cachedModel;

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- avoid top-level ESM/CJS interop where `mongoose` is undefined at module evaluation
  const mongoose = require('mongoose') as MongooseModule;
  if (!mongoose?.model) {
    throw new Error(
      '[tdarts/core] mongoose is not available. Install mongoose in the app and only import system-settings on the server.',
    );
  }

  const { Schema } = mongoose;

  const featuresSchema = new Schema<FeatureTogglesMap>(
    {
      LEAGUES: { type: Boolean, default: true },
      SOCKET: { type: Boolean, default: true },
      LIVE_MATCH_FOLLOWING: { type: Boolean, default: true },
      DETAILED_STATISTICS: { type: Boolean, default: true },
      ADVANCED_STATISTICS: { type: Boolean, default: true },
      OAC_CREATION: { type: Boolean, default: true },
      ADS: { type: Boolean, default: false },
      ADS_PLACEHOLDER: { type: Boolean, default: false },
    },
    { _id: false },
  );

  const systemSettingsSchema = new Schema<SystemSettingsDocument>(
    {
      _id: { type: String, default: SYSTEM_SETTINGS_SINGLETON_ID },
      features: { type: featuresSchema, default: () => ({}) },
      subscriptionPaywallEnabled: { type: Boolean, default: false },
      superAdminBypassEnabled: { type: Boolean, default: true },
      updatedBy: { type: String, default: null },
    },
    { collection: 'system_settings', timestamps: { createdAt: false, updatedAt: true } },
  );

  cachedModel =
    (mongoose.models.SystemSettings as Model<SystemSettingsDocument>) ||
    mongoose.model<SystemSettingsDocument>('SystemSettings', systemSettingsSchema);

  return cachedModel;
}
