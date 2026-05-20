import {
  buildStreamBullupPopupHtml,
  type StreamBullupPlayerBlock,
} from "@/components/tournament/streamBullupPopupDocument";

export type OpenBullupOverlayParams = {
  windowName: string;
  variant: "single" | "matchup";
  players: StreamBullupPlayerBlock[];
  title?: string;
};

export function openBullupOverlay(params: OpenBullupOverlayParams): boolean {
  if (typeof window === "undefined") return false;
  const win = window.open(
    "",
    params.windowName,
    "width=960,height=420,scrollbars=no,resizable=yes"
  );
  if (!win) return false;
  const html = buildStreamBullupPopupHtml({
    variant: params.variant,
    players: params.players,
    title: params.title,
  });
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
