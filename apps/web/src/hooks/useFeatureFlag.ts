"use client";

import { useState, useEffect } from "react";
import { checkFeatureFlagAction } from "@/features/feature-flags/actions/checkFeatureFlags.action";
import { normalizeFeatureKey } from "@/features/flags/lib/featureKeys";
import {
  guardFailureToFeatureFlagDenial,
  isGuardFailureResult,
  type FeatureFlagDenialReason,
} from "@/shared/lib/guards/result";

export type FeatureFlagCheckOutcome = {
  enabled: boolean;
  /** When `enabled` is false, why (when known). Null while loading or if enabled. */
  denialReason: FeatureFlagDenialReason | null;
};

async function checkFeatureFlagClientOutcome(
  featureName: string,
  clubId?: string
): Promise<FeatureFlagCheckOutcome> {
  const disabled = (reason: FeatureFlagDenialReason): FeatureFlagCheckOutcome => ({
    enabled: false,
    denialReason: reason,
  });

  if (process.env.NEXT_PUBLIC_ENABLE_ALL === "true") {
    return { enabled: true, denialReason: null };
  }

  const normalizedFeature = normalizeFeatureKey(featureName);
  if (!normalizedFeature) {
    return disabled("feature_disabled");
  }

  const envVarName = `NEXT_PUBLIC_ENABLE_${normalizedFeature}`;
  const envValue = process.env[envVarName];

  if (envValue === undefined) {
    if (normalizedFeature === "DETAILED_STATISTICS" && clubId) {
      try {
        const data = await checkFeatureFlagAction({ feature: normalizedFeature, clubId });
        if (isGuardFailureResult(data)) {
          return disabled(guardFailureToFeatureFlagDenial(data) ?? "feature_disabled");
        }
        return {
          enabled: data.enabled,
          denialReason: data.enabled ? null : "feature_disabled",
        };
      } catch (error) {
        console.error("Error checking detailedStatistics feature via API:", error);
        return disabled("feature_disabled");
      }
    }
    return disabled("feature_disabled");
  }

  const envEnabled = envValue.toLowerCase() === "true";

  if (!envEnabled) {
    return disabled("feature_disabled");
  }

  if (!clubId) {
    return { enabled: envEnabled, denialReason: null };
  }

  try {
    const data = await checkFeatureFlagAction({ feature: normalizedFeature, clubId });
    if (isGuardFailureResult(data)) {
      return disabled(guardFailureToFeatureFlagDenial(data) ?? "feature_disabled");
    }
    return {
      enabled: data.enabled,
      denialReason: data.enabled ? null : "feature_disabled",
    };
  } catch (error) {
    console.error("Error checking feature flag via API:", error);
    if (normalizedFeature === "SOCKET" && envEnabled) {
      // Keep live updates reliable when env explicitly enables socket.
      // Explicit guard denials are handled above; this branch is for transport/runtime failures.
      return { enabled: true, denialReason: null };
    }
    return disabled("feature_disabled");
  }
}

async function checkSocketFeatureClientOutcome(clubId?: string): Promise<FeatureFlagCheckOutcome> {
  const envValue = process.env.NEXT_PUBLIC_ENABLE_SOCKET;
  const envEnabled = envValue?.toLowerCase() === "true";

  // Keep explicit env-level opt-out behavior unchanged.
  if (!envEnabled) {
    return { enabled: false, denialReason: "feature_disabled" };
  }

  // With env enabled and no club context, allow socket immediately.
  if (!clubId) {
    return { enabled: true, denialReason: null };
  }

  try {
    const outcome = await checkFeatureFlagClientOutcome("SOCKET", clubId);
    return outcome;
  } catch (error) {
    // Critical reliability rule: when socket is env-enabled, do not fail closed
    // on transient feature-check transport/server errors.
    console.error("Socket feature check failed, falling back to env-enabled state:", error);
    return { enabled: true, denialReason: null };
  }
}

export const useFeatureFlag = (featureName: string, clubId?: string) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState<FeatureFlagDenialReason | null>(null);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setDenialReason(null);
        const outcome = await checkFeatureFlagClientOutcome(featureName, clubId);
        setIsEnabled(outcome.enabled);
        setDenialReason(outcome.enabled ? null : outcome.denialReason);
      } catch (err) {
        console.error("Error checking feature flag:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsEnabled(false);
        setDenialReason("feature_disabled");
      } finally {
        setIsLoading(false);
      }
    };

    void checkFeatureFlag();
  }, [featureName, clubId]);

  return { isEnabled, isLoading, error, denialReason };
};

export const useSocketFeature = (clubId?: string) => {
  const [isSocketEnabled, setIsSocketEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState<FeatureFlagDenialReason | null>(null);

  useEffect(() => {
    const checkSocketFeature = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setDenialReason(null);
        const outcome = await checkSocketFeatureClientOutcome(clubId);
        setIsSocketEnabled(outcome.enabled);
        setDenialReason(outcome.enabled ? null : outcome.denialReason);
      } catch (err) {
        console.error("Error checking socket feature:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsSocketEnabled(false);
        setDenialReason("feature_disabled");
      } finally {
        setIsLoading(false);
      }
    };

    void checkSocketFeature();
  }, [clubId]);

  return { isSocketEnabled, isLoading, error, denialReason };
};
