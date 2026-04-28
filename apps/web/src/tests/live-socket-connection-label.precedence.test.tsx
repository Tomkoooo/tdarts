import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveSocketConnectionLabel } from "@/components/tournament/LiveSocketConnectionLabel";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: Array<string | undefined | null | false>) => args.filter(Boolean).join(" "),
}));

describe("LiveSocketConnectionLabel precedence", () => {
  it("shows global_disabled text over subscription_required when feature is off", () => {
    const html = renderToStaticMarkup(
      <LiveSocketConnectionLabel
        socketStatus="feature_off"
        denialReason="subscription_required"
        gateReason="global_disabled"
        featureError={null}
      />,
    );

    expect(html).toContain("live_matches.socket_status.global_disabled");
    expect(html).not.toContain("live_matches.socket_status.subscription_required");
  });

  it("shows paywall_off text when paywall bypass is active", () => {
    const html = renderToStaticMarkup(
      <LiveSocketConnectionLabel
        socketStatus="feature_off"
        denialReason={null}
        gateReason="paywall_disabled_bypass"
        featureError={null}
      />,
    );

    expect(html).toContain("live_matches.socket_status.paywall_off");
  });
});
