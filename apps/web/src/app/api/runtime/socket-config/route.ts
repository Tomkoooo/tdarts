import { NextResponse } from "next/server";
import { isSubscriptionPaywallActive } from "@/features/flags/lib/subscriptionPaywall";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET;
  const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "https://socket.tdarts.hu";

  return NextResponse.json(
    {
      socketEnabled: String(rawEnabled ?? "").toLowerCase() === "true",
      socketServerUrl,
      rawEnabled: rawEnabled ?? null,
      subscriptionPaywallEnabled: isSubscriptionPaywallActive(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
