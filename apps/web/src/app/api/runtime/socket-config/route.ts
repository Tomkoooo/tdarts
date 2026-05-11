import { NextResponse } from "next/server";
import { getSystemSettings } from "@tdarts/core/system-settings";

export const dynamic = "force-dynamic";

/**
 * Runtime config endpoint for the client. Reads the socket toggle and the
 * paywall toggle from the SystemSettings DB doc so client gating reflects
 * what an admin actually configured (not what was baked in at build time).
 */
export async function GET() {
  const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "https://socket.tdarts.hu";
  let settings: Awaited<ReturnType<typeof getSystemSettings>> | null = null;
  try {
    settings = await getSystemSettings();
  } catch (error) {
    console.error("[runtime/socket-config] Failed to load system settings", error);
  }

  const socketEnabled = settings?.features.SOCKET === true;
  const subscriptionPaywallEnabled = settings?.subscriptionPaywallEnabled === true;

  return NextResponse.json(
    {
      socketEnabled,
      socketServerUrl,
      rawEnabled: socketEnabled ? "true" : "false",
      subscriptionPaywallEnabled,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
