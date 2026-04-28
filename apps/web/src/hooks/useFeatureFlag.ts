"use client";

import { useState, useEffect } from "react";
import { checkFeatureFlagAction } from "@/features/feature-flags/actions/checkFeatureFlags.action";
import { normalizeFeatureKey } from "@/features/flags/lib/featureKeys";
import {
  mergeSocketGlobalEnabled,
  resolveSocketGateBeforeEligibility,
  gateReasonFromDenial,
  type SocketGateClientOutcome,
  type SocketGateReason,
} from "@/features/flags/lib/socketFeatureGate";
import {
  guardFailureToFeatureFlagDenial,
  isGuardFailureResult,
  type FeatureFlagDenialReason,
} from "@/shared/lib/guards/result";

export type { SocketGateReason, SocketGateClientOutcome } from "@/features/flags/lib/socketFeatureGate";

export type FeatureFlagCheckOutcome = {
  enabled: boolean;
  /** When `enabled` is false, why (when known). Null while loading or if enabled. */
  denialReason: FeatureFlagDenialReason | null;
};

type RuntimeSocketConfigResponse = {
  socketEnabled?: boolean;
  socketServerUrl?: string;
  rawEnabled?: string | null;
  subscriptionPaywallEnabled?: boolean;
};

async function getRuntimeSocketConfig(): Promise<{
  socketEnabled: boolean | null;
  subscriptionPaywallEnabled: boolean | null;
}> {
  try {
    const response = await fetch("/api/runtime/socket-config", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return { socketEnabled: null, subscriptionPaywallEnabled: null };
    }
    const payload = (await response.json()) as RuntimeSocketConfigResponse;
    return {
      socketEnabled: typeof payload.socketEnabled === "boolean" ? payload.socketEnabled : null,
      subscriptionPaywallEnabled:
        typeof payload.subscriptionPaywallEnabled === "boolean"
          ? payload.subscriptionPaywallEnabled
          : null,
    };
  } catch {
    return { socketEnabled: null, subscriptionPaywallEnabled: null };
  }
}

async function checkFeatureFlagClientOutcome(
  featureName: string,
  clubId?: string,
): Promise<FeatureFlagCheckOutcome> {
  const disabled = (reason: FeatureFlagDenialReason): FeatureFlagCheckOutcome => ({
    enabled: false,
    denialReason: reason,
  });

  const normalizedFeature = normalizeFeatureKey(featureName);
  if (!normalizedFeature) {
    return disabled("feature_disabled");
  }

  const envVarName = `NEXT_PUBLIC_ENABLE_${normalizedFeature}`;
  const envValue = process.env[envVarName];

  // Precedence rule:
  // 1) Explicit per-feature env flag (if present) always wins.
  // 2) Global NEXT_PUBLIC_ENABLE_ALL only applies when feature-specific env is absent.
  if (envValue !== undefined) {
    const envEnabled = envValue.toLowerCase() === "true";
    if (!envEnabled) {
      return disabled("feature_disabled");
    }
    if (!clubId) {
      return { enabled: true, denialReason: null };
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
        return { enabled: true, denialReason: null };
      }
      return disabled("feature_disabled");
    }
  }

  if (process.env.NEXT_PUBLIC_ENABLE_ALL === "true") {
    return { enabled: true, denialReason: null };
  }
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

  return disabled("feature_disabled");
}

/** Client-side socket gate (runtime config + subscription paywall + optional club eligibility). */
export async function checkSocketFeatureClientOutcome(clubId?: string): Promise<SocketGateClientOutcome> {
  const runtimeConfig = await getRuntimeSocketConfig();
  const globalSocketEnabled = mergeSocketGlobalEnabled({
    buildEnvRaw: process.env.NEXT_PUBLIC_ENABLE_SOCKET,
    runtimeSocketEnabled: runtimeConfig.socketEnabled,
  });
  const subscriptionPaywallEnabled = runtimeConfig.subscriptionPaywallEnabled ?? true;

  const phase = resolveSocketGateBeforeEligibility({
    globalSocketEnabled,
    subscriptionPaywallEnabled,
    clubId,
  });

  if (phase.kind === "terminal") {
    return phase.outcome;
  }

  try {
    const data = await checkFeatureFlagAction({ feature: "SOCKET", clubId: phase.clubId });
    if (isGuardFailureResult(data)) {
      const mapped = guardFailureToFeatureFlagDenial(data) ?? "feature_disabled";
      return {
        enabled: false,
        denialReason: mapped,
        gateReason: gateReasonFromDenial(mapped),
      };
    }

    if (!data.enabled) {
      return {
        enabled: false,
        denialReason: "feature_disabled",
        gateReason: "feature_disabled",
      };
    }

    return { enabled: true, denialReason: null, gateReason: "enabled" };
  } catch (error) {
    console.error("Socket eligibility check failed:", error);
    return {
      enabled: false,
      denialReason: "feature_disabled",
      gateReason: "eligibility_check_failed",
    };
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
  const [gateReason, setGateReason] = useState<SocketGateReason>("enabled");

  useEffect(() => {
    const checkSocketFeature = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setDenialReason(null);
        setGateReason("enabled");
        const outcome = await checkSocketFeatureClientOutcome(clubId);
        setIsSocketEnabled(outcome.enabled);
        setDenialReason(outcome.enabled ? null : outcome.denialReason);
        setGateReason(outcome.gateReason);
      } catch (err) {
        console.error("Error checking socket feature:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsSocketEnabled(false);
        setDenialReason("feature_disabled");
        setGateReason("eligibility_check_failed");
      } finally {
        setIsLoading(false);
      }
    };

    void checkSocketFeature();
  }, [clubId]);

  return { isSocketEnabled, isLoading, error, denialReason, gateReason };
};
