import type { FeatureToggleKey, FeatureTogglesMap } from '@tdarts/core';

export type AdminSystemSettingsView = {
  features: FeatureTogglesMap;
  subscriptionPaywallEnabled: boolean;
  superAdminBypassEnabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

export type { FeatureToggleKey };
