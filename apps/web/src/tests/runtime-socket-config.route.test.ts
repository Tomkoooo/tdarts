import { getSystemSettings } from "@tdarts/core/system-settings";
import { GET } from "@/app/api/runtime/socket-config/route";

jest.mock("@tdarts/core/system-settings", () => ({
  getSystemSettings: jest.fn(),
}));

const mockedGetSystemSettings = getSystemSettings as jest.MockedFunction<typeof getSystemSettings>;

describe("GET /api/runtime/socket-config", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SOCKET_SERVER_URL = "http://localhost:8080";
  });

  afterAll(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    } else {
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL = originalUrl;
    }
  });

  it("returns DB-backed socket and paywall toggles", async () => {
    mockedGetSystemSettings.mockResolvedValue({
      features: {
        LEAGUES: true,
        SOCKET: true,
        LIVE_MATCH_FOLLOWING: true,
        DETAILED_STATISTICS: true,
        ADVANCED_STATISTICS: true,
        OAC_CREATION: true,
      },
      subscriptionPaywallEnabled: true,
      superAdminBypassEnabled: true,
      updatedAt: new Date(),
      updatedBy: null,
    } as any);

    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      socketEnabled: true,
      rawEnabled: "true",
      subscriptionPaywallEnabled: true,
      socketServerUrl: "http://localhost:8080",
    });
  });

  it("fails safe when settings read throws", async () => {
    mockedGetSystemSettings.mockRejectedValue(new Error("db down"));

    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      socketEnabled: false,
      rawEnabled: "false",
      subscriptionPaywallEnabled: false,
      socketServerUrl: "http://localhost:8080",
    });
  });
});
