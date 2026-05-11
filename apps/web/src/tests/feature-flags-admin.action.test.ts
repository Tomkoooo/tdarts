import { AuthorizationService } from "@tdarts/services";
import { authorizeUserResult } from "@/shared/lib/guards";
import {
  getSystemSettings,
  updateFeatureToggle,
  updateSubscriptionPaywallEnabled,
  updateSuperAdminBypassEnabled,
} from "@tdarts/core/system-settings";
import {
  adminGetSystemSettingsAction,
  adminUpdateFeatureFlagAction,
  adminUpdateSubscriptionPaywallAction,
  adminUpdateSuperAdminBypassAction,
} from "@/features/admin/actions/featureFlagsAdmin.action";

jest.mock("@/shared/lib/guards", () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock("@tdarts/services", () => ({
  AuthorizationService: {
    isGlobalAdmin: jest.fn(),
  },
}));

jest.mock("@tdarts/core/system-settings", () => ({
  getSystemSettings: jest.fn(),
  updateFeatureToggle: jest.fn(),
  updateSubscriptionPaywallEnabled: jest.fn(),
  updateSuperAdminBypassEnabled: jest.fn(),
}));

jest.mock("@/shared/lib/withTelemetry", () => ({
  withTelemetry: (_name: string, fn: (...args: any[]) => Promise<unknown>) => fn,
}));

const mockedAuthorizeUserResult = authorizeUserResult as jest.MockedFunction<typeof authorizeUserResult>;
const mockedIsGlobalAdmin = AuthorizationService.isGlobalAdmin as jest.MockedFunction<
  typeof AuthorizationService.isGlobalAdmin
>;
const mockedGetSystemSettings = getSystemSettings as jest.MockedFunction<typeof getSystemSettings>;
const mockedUpdateFeatureToggle = updateFeatureToggle as jest.MockedFunction<typeof updateFeatureToggle>;
const mockedUpdateSubscriptionPaywallEnabled = updateSubscriptionPaywallEnabled as jest.MockedFunction<
  typeof updateSubscriptionPaywallEnabled
>;
const mockedUpdateSuperAdminBypassEnabled = updateSuperAdminBypassEnabled as jest.MockedFunction<
  typeof updateSuperAdminBypassEnabled
>;

const sampleSnapshot = {
  features: {
    LEAGUES: true,
    SOCKET: true,
    LIVE_MATCH_FOLLOWING: true,
    DETAILED_STATISTICS: true,
    ADVANCED_STATISTICS: true,
    OAC_CREATION: true,
  },
  subscriptionPaywallEnabled: false,
  superAdminBypassEnabled: true,
  updatedAt: new Date("2026-05-08T08:00:00.000Z"),
  updatedBy: "admin-1",
} as Awaited<ReturnType<typeof getSystemSettings>>;

describe("featureFlagsAdmin actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthorizeUserResult.mockResolvedValue({
      ok: true,
      data: { userId: "admin-1" },
      status: 200,
      message: "",
    } as any);
    mockedIsGlobalAdmin.mockResolvedValue(true as any);
    mockedGetSystemSettings.mockResolvedValue(sampleSnapshot as any);
    mockedUpdateFeatureToggle.mockResolvedValue(sampleSnapshot as any);
    mockedUpdateSubscriptionPaywallEnabled.mockResolvedValue(sampleSnapshot as any);
    mockedUpdateSuperAdminBypassEnabled.mockResolvedValue(sampleSnapshot as any);
  });

  it("blocks non-admin users", async () => {
    mockedIsGlobalAdmin.mockResolvedValue(false as any);
    const result = await adminGetSystemSettingsAction();
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(mockedGetSystemSettings).not.toHaveBeenCalled();
  });

  it("returns DB-backed settings for admins", async () => {
    const result = await adminGetSystemSettingsAction();
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      data: {
        features: sampleSnapshot.features,
        subscriptionPaywallEnabled: false,
        superAdminBypassEnabled: true,
      },
    });
  });

  it("updates feature toggle with actor id", async () => {
    await adminUpdateFeatureFlagAction({ key: "SOCKET", enabled: false });
    expect(mockedUpdateFeatureToggle).toHaveBeenCalledWith("SOCKET", false, "admin-1");
  });

  it("updates paywall toggle with actor id", async () => {
    await adminUpdateSubscriptionPaywallAction({ enabled: true });
    expect(mockedUpdateSubscriptionPaywallEnabled).toHaveBeenCalledWith(true, "admin-1");
  });

  it("updates super-admin bypass toggle with actor id", async () => {
    await adminUpdateSuperAdminBypassAction({ enabled: false });
    expect(mockedUpdateSuperAdminBypassEnabled).toHaveBeenCalledWith(false, "admin-1");
  });

  it("rejects invalid feature key payload", async () => {
    const result = await adminUpdateFeatureFlagAction({ key: "INVALID_KEY" as any, enabled: true });
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(mockedUpdateFeatureToggle).not.toHaveBeenCalled();
  });
});
