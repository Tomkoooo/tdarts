import * as checkFlags from "@/features/feature-flags/actions/checkFeatureFlags.action";
import { checkSocketFeatureClientOutcome } from "@/hooks/useFeatureFlag";

describe("checkSocketFeatureClientOutcome (runtime config-driven)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(checkFlags, "checkFeatureFlagAction").mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("does not call subscription eligibility when runtime disables socket globally", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          socketEnabled: false,
          subscriptionPaywallEnabled: true,
        }),
      } as Response),
    );

    const out = await checkSocketFeatureClientOutcome("507f1f77bcf86cd799439011");

    expect(checkFlags.checkFeatureFlagAction).not.toHaveBeenCalled();
    expect(out).toEqual({
      enabled: false,
      denialReason: "feature_disabled",
      gateReason: "global_disabled",
    });
  });

  it("does not call eligibility when paywall is off even without club", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          socketEnabled: true,
          subscriptionPaywallEnabled: false,
        }),
      } as Response),
    );

    const out = await checkSocketFeatureClientOutcome(undefined);

    expect(checkFlags.checkFeatureFlagAction).not.toHaveBeenCalled();
    expect(out.gateReason).toBe("paywall_disabled_bypass");
    expect(out.enabled).toBe(true);
  });

  it("returns missing_club_context when paywall is on and club id is absent", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          socketEnabled: true,
          subscriptionPaywallEnabled: true,
        }),
      } as Response),
    );

    const out = await checkSocketFeatureClientOutcome(undefined);

    expect(checkFlags.checkFeatureFlagAction).not.toHaveBeenCalled();
    expect(out).toEqual({
      enabled: false,
      denialReason: "feature_disabled",
      gateReason: "missing_club_context",
    });
  });

  it("keeps global_disabled terminal when both socket and paywall are disabled", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          socketEnabled: false,
          subscriptionPaywallEnabled: false,
        }),
      } as Response),
    );

    const out = await checkSocketFeatureClientOutcome("507f1f77bcf86cd799439011");

    expect(checkFlags.checkFeatureFlagAction).not.toHaveBeenCalled();
    expect(out.gateReason).toBe("global_disabled");
    expect(out.denialReason).toBe("feature_disabled");
  });
});
