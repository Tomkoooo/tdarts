import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

export async function isFeatureAllowed(featureName: string, clubId?: string) {
  return FeatureFlagService.isFeatureEnabled(featureName, clubId);
}

export async function isSocketAllowed(clubId?: string) {
  return FeatureFlagService.isSocketEnabled(clubId);
}
