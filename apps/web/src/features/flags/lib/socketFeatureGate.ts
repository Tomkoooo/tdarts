import type { FeatureFlagDenialReason } from "@/shared/lib/guards/result";

/** Why the socket gate resolved as it did (for UI + telemetry). */
export type SocketGateReason =
  | "enabled"
  | "global_disabled"
  | "paywall_disabled_bypass"
  | "login_required"
  | "subscription_required"
  | "permission_required"
  | "feature_disabled"
  | "eligibility_check_failed"
  | "missing_club_context";

export type SocketGateClientOutcome = {
  enabled: boolean;
  denialReason: FeatureFlagDenialReason | null;
  gateReason: SocketGateReason;
};

/** Runtime overrides build when present; otherwise build env determines global socket availability. */
export function mergeSocketGlobalEnabled(opts: {
  buildEnvRaw: string | undefined;
  runtimeSocketEnabled: boolean | null;
}): boolean {
  const build = String(opts.buildEnvRaw ?? "").toLowerCase() === "true";
  if (opts.runtimeSocketEnabled !== null && opts.runtimeSocketEnabled !== undefined) {
    return opts.runtimeSocketEnabled;
  }
  return build;
}

export type SocketGatePhaseBeforeEligibility =
  | { kind: "terminal"; outcome: SocketGateClientOutcome }
  | { kind: "eligibility"; clubId: string };

/**
 * Terminal outcomes must win before subscription/club checks:
 * global off → global_disabled; paywall off → bypass; paywall on without club → missing_club_context.
 */
export function resolveSocketGateBeforeEligibility(opts: {
  globalSocketEnabled: boolean;
  subscriptionPaywallEnabled: boolean;
  clubId?: string;
}): SocketGatePhaseBeforeEligibility {
  if (!opts.globalSocketEnabled) {
    return {
      kind: "terminal",
      outcome: {
        enabled: false,
        denialReason: "feature_disabled",
        gateReason: "global_disabled",
      },
    };
  }
  if (!opts.subscriptionPaywallEnabled) {
    return {
      kind: "terminal",
      outcome: {
        enabled: true,
        denialReason: null,
        gateReason: "paywall_disabled_bypass",
      },
    };
  }
  const trimmed = opts.clubId?.trim();
  if (!trimmed) {
    return {
      kind: "terminal",
      outcome: {
        enabled: false,
        denialReason: "feature_disabled",
        gateReason: "missing_club_context",
      },
    };
  }
  return { kind: "eligibility", clubId: trimmed };
}

export function gateReasonFromDenial(denial: FeatureFlagDenialReason): SocketGateReason {
  switch (denial) {
    case "login_required":
      return "login_required";
    case "subscription_required":
      return "subscription_required";
    case "permission_required":
      return "permission_required";
    case "feature_disabled":
      return "feature_disabled";
  }
}
