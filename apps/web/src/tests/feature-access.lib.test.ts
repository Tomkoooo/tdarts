import { AuthorizationService } from "@/database/services/authorization.service";
import { authorizeUserResult } from "@/features/auth/lib/authorizeUser";
import { evaluateFeatureAccess } from "@/features/flags/lib/featureAccess";
import { FeatureFlagService } from "@/features/flags/lib/featureFlags";
import {
  __setSystemSettingsCacheForTests,
  bustSystemSettingsCache,
  SYSTEM_SETTINGS_DEFAULTS,
  type SystemSettingsSnapshot,
} from "@tdarts/core/system-settings";

jest.mock("@/features/auth/lib/authorizeUser", () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock("@/database/services/authorization.service", () => ({
  AuthorizationService: {
    isGlobalAdmin: jest.fn(),
  },
}));

jest.mock("@/features/flags/lib/featureFlags", () => ({
  FeatureFlagService: {
    isGlobalFeatureEnabled: jest.fn(),
    evaluateClubFeature: jest.fn(),
  },
}));

const mockedAuth = authorizeUserResult as jest.MockedFunction<typeof authorizeUserResult>;
const mockedIsGlobalAdmin = AuthorizationService.isGlobalAdmin as jest.MockedFunction<
  typeof AuthorizationService.isGlobalAdmin
>;
const mockedIsGlobalFeatureEnabled = FeatureFlagService.isGlobalFeatureEnabled as jest.MockedFunction<
  typeof FeatureFlagService.isGlobalFeatureEnabled
>;
const mockedEvaluateClubFeature = FeatureFlagService.evaluateClubFeature as jest.MockedFunction<
  typeof FeatureFlagService.evaluateClubFeature
>;

function setSettings(overrides: Partial<SystemSettingsSnapshot> = {}) {
  const snapshot: SystemSettingsSnapshot = {
    features: { ...SYSTEM_SETTINGS_DEFAULTS.features, ...(overrides.features ?? {}) },
    subscriptionPaywallEnabled:
      overrides.subscriptionPaywallEnabled ?? SYSTEM_SETTINGS_DEFAULTS.subscriptionPaywallEnabled,
    superAdminBypassEnabled:
      overrides.superAdminBypassEnabled ?? SYSTEM_SETTINGS_DEFAULTS.superAdminBypassEnabled,
    updatedAt: overrides.updatedAt ?? new Date(),
    updatedBy: overrides.updatedBy ?? null,
  };
  __setSystemSettingsCacheForTests(snapshot);
  return snapshot;
}

describe("evaluateFeatureAccess - gating precedence matrix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bustSystemSettingsCache();
    setSettings({ subscriptionPaywallEnabled: true, superAdminBypassEnabled: true });
    mockedAuth.mockResolvedValue({ ok: true, data: { userId: "u1" } } as any);
    mockedIsGlobalAdmin.mockResolvedValue(false as any);
    mockedIsGlobalFeatureEnabled.mockResolvedValue(true as any);
    mockedEvaluateClubFeature.mockResolvedValue({ kind: "allowed" } as any);
  });

  afterEach(() => {
    bustSystemSettingsCache();
  });

  it("returns FEATURE_DISABLED before any club check when global feature is off", async () => {
    mockedIsGlobalFeatureEnabled.mockResolvedValue(false as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toEqual({
      ok: false,
      code: "FEATURE_DISABLED",
      status: 403,
      message: "Feature disabled: SOCKET",
    });
    expect(mockedEvaluateClubFeature).not.toHaveBeenCalled();
  });

  it("returns SUBSCRIPTION_REQUIRED when tier lacks the feature", async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    mockedEvaluateClubFeature.mockResolvedValue({
      kind: "subscription_required",
      reason: "tier_lacks_feature",
    } as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "SUBSCRIPTION_REQUIRED",
      status: 403,
    });
  });

  it("returns CLUB_NOT_ELIGIBLE when tier OK but club flag is off", async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    mockedEvaluateClubFeature.mockResolvedValue({
      kind: "club_not_eligible",
      reason: "club_flag_off",
    } as any);

    const result = await evaluateFeatureAccess({
      featureName: "DETAILED_STATISTICS",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "CLUB_NOT_ELIGIBLE",
      status: 403,
    });
  });

  it("paywall off + global feature on: returns ok with bypassReason=paywall_disabled", async () => {
    setSettings({ subscriptionPaywallEnabled: false });
    mockedEvaluateClubFeature.mockResolvedValue({ kind: "allowed" } as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        userId: "u1",
        featureKey: "SOCKET",
        bypassReason: "paywall_disabled",
      },
    });
  });

  it("returns LOGIN_REQUIRED immediately for unauthenticated users", async () => {
    mockedAuth.mockResolvedValue({
      ok: false,
      code: "LOGIN_REQUIRED",
      status: 401,
      message: "Login required",
    } as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toEqual({
      ok: false,
      code: "LOGIN_REQUIRED",
      status: 401,
      message: "Login required",
    });
    expect(mockedIsGlobalFeatureEnabled).not.toHaveBeenCalled();
  });

  it("super-admin bypass: when enabled, global admin skips all gates", async () => {
    setSettings({ superAdminBypassEnabled: true });
    mockedIsGlobalAdmin.mockResolvedValue(true as any);
    mockedIsGlobalFeatureEnabled.mockResolvedValue(false as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        userId: "u1",
        featureKey: "SOCKET",
        bypassReason: "super_admin",
      },
    });
    expect(mockedIsGlobalFeatureEnabled).not.toHaveBeenCalled();
  });

  it("super-admin bypass: when disabled, global admin goes through normal gates", async () => {
    setSettings({ superAdminBypassEnabled: false });
    mockedIsGlobalAdmin.mockResolvedValue(true as any);
    mockedIsGlobalFeatureEnabled.mockResolvedValue(false as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toEqual({
      ok: false,
      code: "FEATURE_DISABLED",
      status: 403,
      message: "Feature disabled: SOCKET",
    });
  });
});
