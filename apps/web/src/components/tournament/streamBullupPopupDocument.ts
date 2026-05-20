export type StreamBullupRow = {
  label: string;
  value: string;
};

export type StreamBullupPlayerBlock = {
  displayName: string;
  rows: StreamBullupRow[];
};

export type StreamBullupPopupInit = {
  variant: "single" | "matchup";
  players: StreamBullupPlayerBlock[];
  title?: string;
};

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPlayerTable(player: StreamBullupPlayerBlock): string {
  const name = escHtml(player.displayName);
  const rows = player.rows
    .filter((r) => r.value.trim())
    .map(
      (r) => `
      <tr>
        <th scope="row">${escHtml(r.label)}</th>
        <td>${escHtml(r.value)}</td>
      </tr>`
    )
    .join("");

  return `
    <section class="player-block">
      <h2 class="player-title">${name}</h2>
      <table class="info-table">
        <tbody>${rows || `<tr><td colspan="2" class="empty">—</td></tr>`}</tbody>
      </table>
    </section>`;
}

export function buildStreamBullupPopupHtml(init: StreamBullupPopupInit): string {
  const title = escHtml(init.title ?? "Player intro");
  const isMatchup = init.variant === "matchup" && init.players.length >= 2;
  const bodyClass = isMatchup ? "layout-matchup" : "layout-single";
  const playersHtml = init.players.map(renderPlayerTable).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${title}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { background: transparent; color-scheme: dark; }
      body {
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        color: #fff;
        min-height: 100vh;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
      }
      .wrap {
        padding: 0.75rem 1rem 1.25rem;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .layout-single .players {
        flex: 1;
        display: flex;
        align-items: stretch;
      }
      .layout-matchup .players {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        align-items: stretch;
      }
      .player-block {
        background: oklch(14% 0.025 14 / 0.92);
        border: 1px solid oklch(51% 0.18 16 / 0.35);
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .player-title {
        font-size: clamp(1.1rem, 3vw, 1.65rem);
        font-weight: 800;
        padding: 0.55rem 0.75rem;
        background: oklch(48% 0.17 16);
        border-bottom: 1px solid oklch(40% 0.14 16 / 0.9);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        font-size: clamp(0.85rem, 2.2vw, 1.05rem);
      }
      .info-table th {
        text-align: left;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.72);
        padding: 0.45rem 0.65rem;
        width: 38%;
        vertical-align: top;
        border-bottom: 1px solid oklch(51% 0.18 16 / 0.15);
      }
      .info-table td {
        font-weight: 600;
        padding: 0.45rem 0.65rem;
        border-bottom: 1px solid oklch(51% 0.18 16 / 0.15);
        font-variant-numeric: tabular-nums;
      }
      .info-table tr:last-child th,
      .info-table tr:last-child td { border-bottom: none; }
      .empty { color: rgba(255,255,255,0.5); font-style: italic; }
    </style>
  </head>
  <body class="${bodyClass}">
    <div class="wrap">
      <div class="players">${playersHtml}</div>
    </div>
  </body>
</html>`;
}
