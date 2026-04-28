import {
  gateReasonFromDenial,
  mergeSocketGlobalEnabled,
  resolveSocketGateBeforeEligibility,
} from "@/features/flags/lib/socketFeatureGate";

describe("mergeSocketGlobalEnabled", () => {
  it("uses runtime boolean when set", () => {
    expect(
      mergeSocketGlobalEnabled({ buildEnvRaw: "true", runtimeSocketEnabled: false }),
    ).toBe(false);
    expect(
      mergeSocketGlobalEnabled({ buildEnvRaw: "false", runtimeSocketEnabled: true }),
    ).toBe(true);
  });

  it("falls back to build when runtime is null", () => {
    expect(
      mergeSocketGlobalEnabled({ buildEnvRaw: "true", runtimeSocketEnabled: null }),
    ).toBe(true);
    expect(
      mergeSocketGlobalEnabled({ buildEnvRaw: undefined, runtimeSocketEnabled: null }),
    ).toBe(false);
  });
});

describe("resolveSocketGateBeforeEligibility", () => {
  it("global off is terminal before subscription messaging", () => {
    const r = resolveSocketGateBeforeEligibility({
      globalSocketEnabled: false,
      subscriptionPaywallEnabled: true,
      clubId: "club1",
    });
    expect(r).toEqual({
      kind: "terminal",
      outcome: {
        enabled: false,
        denialReason: "feature_disabled",
        gateReason: "global_disabled",
      },
    });
  });

  it("paywall off bypasses club eligibility", () => {
    const r = resolveSocketGateBeforeEligibility({
      globalSocketEnabled: true,
      subscriptionPaywallEnabled: false,
      clubId: undefined,
    });
    expect(r).toEqual({
      kind: "terminal",
      outcome: {
        enabled: true,
        denialReason: null,
        gateReason: "paywall_disabled_bypass",
      },
    });
  });

  it("paywall on without club is missing_club_context (not eligibility)", () => {
    const r = resolveSocketGateBeforeEligibility({
      globalSocketEnabled: true,
      subscriptionPaywallEnabled: true,
      clubId: undefined,
    });
    expect(r).toEqual({
      kind: "terminal",
      outcome: {
        enabled: false,
        denialReason: "feature_disabled",
        gateReason: "missing_club_context",
      },
    });
  });

  it("paywall on with club proceeds to eligibility", () => {
    const r = resolveSocketGateBeforeEligibility({
      globalSocketEnabled: true,
      subscriptionPaywallEnabled: true,
      clubId: "  x  ",
    });
    expect(r).toEqual({ kind: "eligibility", clubId: "x" });
  });
});

describe("gateReasonFromDenial", () => {
  it("maps subscription denial to subscription gate reason", () => {
    expect(gateReasonFromDenial("subscription_required")).toBe("subscription_required");
  });
});
