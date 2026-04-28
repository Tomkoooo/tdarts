import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LiveLayout from "@/app/[locale]/tournaments/[code]/live/layout";
import { FeatureFlagService } from "@/features/flags/lib/featureFlags";
import { findTournamentByCode } from "@/features/tournaments/lib/liveLayout.db";

jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/mongoose", () => ({
  connectMongo: jest.fn(async () => undefined),
}));

jest.mock("@/features/tournaments/lib/liveLayout.db", () => ({
  findTournamentByCode: jest.fn(),
}));

jest.mock("@/features/flags/lib/featureFlags", () => ({
  FeatureFlagService: {
    isSocketEnabled: jest.fn(),
    isEnvFeatureEnabled: jest.fn(),
  },
}));

jest.mock("@/i18n/routing", () => ({
  Link: ({ children }: { children: React.ReactNode }) => React.createElement("a", null, children),
}));

jest.mock("@/components/ui/Card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h3", null, children),
  CardDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children),
}));

jest.mock("@/components/ui/Button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => React.createElement("button", null, children),
}));

describe("LiveLayout socket/subscription messaging precedence", () => {
  it("does not show subscription upsell copy when socket is globally disabled", async () => {
    (findTournamentByCode as jest.Mock).mockResolvedValueOnce({
      clubId: { toString: () => "club-1" },
    });
    (FeatureFlagService.isSocketEnabled as jest.Mock).mockResolvedValueOnce(false);
    (FeatureFlagService.isEnvFeatureEnabled as jest.Mock).mockReturnValueOnce(false);

    const tree = await LiveLayout({
      children: React.createElement("div", null, "child"),
      params: Promise.resolve({ locale: "en", code: "ABC123" }),
    });
    const html = renderToStaticMarkup(tree);

    // Red-phase bug reproducer: this must fail while layout always renders the subscription upsell card.
    expect(html).not.toContain("pro_előfizetés_előnyei");
    expect(html).not.toContain("ha_már_pro");
  });
});
