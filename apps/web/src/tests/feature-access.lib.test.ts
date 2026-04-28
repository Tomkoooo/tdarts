import { AuthorizationService } from "@/database/services/authorization.service";
import { authorizeUserResult } from "@/features/auth/lib/authorizeUser";
import { evaluateFeatureAccess } from "@/features/flags/lib/featureAccess";
import { FeatureFlagService } from "@/features/flags/lib/featureFlags";

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
    isFeatureEnabled: jest.fn(),
    isClubFeatureEnabled: jest.fn(),
  },
}));

const mockedAuth = authorizeUserResult as jest.MockedFunction<typeof authorizeUserResult>;
const mockedIsGlobalAdmin = AuthorizationService.isGlobalAdmin as jest.MockedFunction<typeof AuthorizationService.isGlobalAdmin>;
const mockedIsFeatureEnabled = FeatureFlagService.isFeatureEnabled as jest.MockedFunction<typeof FeatureFlagService.isFeatureEnabled>;
const mockedIsClubFeatureEnabled = FeatureFlagService.isClubFeatureEnabled as jest.MockedFunction<typeof FeatureFlagService.isClubFeatureEnabled>;

describe("evaluateFeatureAccess - gating precedence matrix", () => {
  const envSnapshot = process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = "true";
    mockedAuth.mockResolvedValue({ ok: true, data: { userId: "u1" } } as any);
    mockedIsGlobalAdmin.mockResolvedValue(false as any);
    mockedIsFeatureEnabled.mockResolvedValue(true as any);
    mockedIsClubFeatureEnabled.mockResolvedValue(true as any);
  });

  afterAll(() => {
    if (envSnapshot === undefined) delete process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED;
    else process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = envSnapshot;
  });

  it("returns FEATURE_DISABLED before any subscription check when global feature is off", async () => {
    mockedIsFeatureEnabled.mockResolvedValue(false as any);
    mockedIsClubFeatureEnabled.mockResolvedValue(false as any);

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
    expect(mockedIsClubFeatureEnabled).not.toHaveBeenCalled();
  });

  it("returns SUBSCRIPTION_REQUIRED only when global feature is enabled and paywall is active", async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = "true";
    mockedIsFeatureEnabled.mockResolvedValue(true as any);
    mockedIsClubFeatureEnabled.mockResolvedValue(false as any);

    const result = await evaluateFeatureAccess({
      featureName: "SOCKET",
      clubId: "club-1",
      requiresSubscription: true,
    });

    expect(result).toEqual({
      ok: false,
      code: "SUBSCRIPTION_REQUIRED",
      status: 403,
      message: "Feature requires subscription: SOCKET",
    });
  });

  it("bypasses club eligibility when paywall is disabled", async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = "false";
    mockedIsFeatureEnabled.mockResolvedValue(true as any);
    mockedIsClubFeatureEnabled.mockResolvedValue(false as any);

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
    expect(mockedIsClubFeatureEnabled).not.toHaveBeenCalled();
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
    expect(mockedIsFeatureEnabled).not.toHaveBeenCalled();
  });
});
