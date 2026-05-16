/**
 * Legacy stream popup: vanilla HTML/CSS/JS only (generated `document.write` window).
 * Colored panels on a transparent body (OBS). Header: brand (left), tournament (center), BO/leg (right).
 * Reads `window.opener.__tdartsLockedStreamState` / `__tdartsLockedStreamData` when
 * `window.opener.__tdartsStreamLockMatchId` matches `lockedMatchId` (set when the stream opens),
 * so changing the selected match in the parent tab does not swap OBS content to another pairing.
 * Falls back to `matchState` / `matchData` only for older openers that never set the lock globals.
 */

export type LegacyStreamPopupInit = {
  /** Match this stream is bound to; ignore opener globals when the live tab follows another match. */
  lockedMatchId: string;
  logoUrl: string;
  player1Name: string;
  player2Name: string;
  legsToWin: number;
  currentLeg: number;
  p1Remaining: number;
  p2Remaining: number;
  p1LegsWon: number;
  p2LegsWon: number;
  /** Center: tournament title (from settings or code). */
  tournamentName: string;
  /** Center: second line — group / knockout stage (pre-localized). */
  stageLine: string;
  /** Tail for live leg line after "BO{n} · …", must contain "__LEG__" for the running leg number. */
  scoringLegTailTemplate: string;
  /** Line above BO/leg (e.g. "Scoring on tDarts"). */
  scoringOnTdartsLine: string;
  /** Optional column labels (defaults match original English). */
  labelAvg?: string;
  labelLegsCol?: string;
  labelScoreCol?: string;
  /** Shown when opener has no `matchState` yet (e.g. pre-board). */
  waitingHint?: string;
  /** Pending / pre-first-throw: hide scoreboard and show `streamUpcomingMessage` until live. */
  initialUpcomingLayout?: boolean;
  /** Pre-localized (e.g. next-intl) “starting soon” line for OBS upcoming popup. */
  streamUpcomingMessage?: string;
  /** When false, hide the AVG column (3-column layout). Default true. */
  showAvg?: boolean;
};

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s: string): string {
  return escHtml(s);
}

export function buildLegacyStreamPopupHtml(init: LegacyStreamPopupInit): string {
  const p1 = escHtml(init.player1Name);
  const p2 = escHtml(init.player2Name);
  const title = escHtml(`${init.player1Name} vs ${init.player2Name}`);
  const bo = (init.legsToWin || 3) * 2 - 1;
  const logo = escAttr(init.logoUrl);
  const colAvg = escHtml(init.labelAvg ?? "AVG");
  const colLegs = escHtml(init.labelLegsCol ?? "LEGS");
  const colScore = escHtml(init.labelScoreCol ?? "SCORE");
  const waiting = escHtml(init.waitingHint ?? "Waiting for live data — keep this tournament tab open.");
  const tn = escHtml(init.tournamentName || "");
  const st = escHtml(init.stageLine || "");
  const legTplJs = JSON.stringify(init.scoringLegTailTemplate || "Leg __LEG__");
  const initialLegTail = escHtml(
    (init.scoringLegTailTemplate || "Leg __LEG__").replace("__LEG__", String(init.currentLeg || 1)),
  );
  const scoringOn = escHtml(init.scoringOnTdartsLine || "Scoring on tDarts");
  const lockIdJs = JSON.stringify(String(init.lockedMatchId || ""));
  const initialUpcoming = !!init.initialUpcomingLayout;
  const upcomingMsg = escHtml(init.streamUpcomingMessage || "");
  const upcomingVs = escHtml(`${init.player1Name} vs ${init.player2Name}`);
  const sheetClass = initialUpcoming ? "sheet mode-upcoming" : "sheet";
  const showAvg = init.showAvg !== false;
  const gridRowClass = showAvg ? "row4" : "row3";
  const avgHeaderCell = showAvg ? `<div class="gcell">${colAvg}</div>` : "";
  const p1AvgCell = showAvg
    ? `<div class="gcell stat" id="player1-avg" aria-live="polite">0.00</div>`
    : "";
  const p2AvgCell = showAvg
    ? `<div class="gcell stat" id="player2-avg" aria-live="polite">0.00</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>Live Match - ${title}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { background: transparent; color-scheme: dark; }
      body {
        margin: 0;
        padding: 0;
        color: #fff;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        min-height: 100vh;
        min-height: 100dvh;
        overflow: hidden;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
      }
      .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        min-height: 100dvh;
        padding: 0;
      }
      .banner {
        display: none;
        text-align: center;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.92);
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 0;
        padding: 0.4rem 0.5rem;
        margin: 0;
      }
      .banner.on { display: block; }
      .sheet {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        margin: 0;
        border: 1px solid oklch(51% 0.18 16 / 0.45);
        background: linear-gradient(165deg, oklch(22% 0.08 16) 0%, oklch(12% 0.04 12) 55%, oklch(8% 0.02 8) 100%);
      }
      .header-bar {
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        gap: 0.5rem 0.75rem;
        align-items: center;
        padding: 0.5rem 0.65rem;
        border-bottom: 1px solid oklch(51% 0.18 16 / 0.35);
        background: oklch(15% 0.03 14 / 0.92);
      }
      .header-left {
        text-align: left;
        flex-shrink: 0;
      }
      .header-center {
        text-align: center;
        min-width: 0;
        padding: 0 0.25rem;
      }
      .header-right {
        text-align: right;
        flex-shrink: 0;
        min-width: 0;
        max-width: 42vw;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.15rem;
      }
      .scoring-on-label {
        font-size: clamp(0.65rem, 1.5vw, 0.78rem);
        font-weight: 600;
        letter-spacing: 0.02em;
        color: rgba(255, 255, 255, 0.72);
        text-transform: uppercase;
      }
      .brand-row {
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }
      .logo {
        width: 52px;
        height: 52px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .brand-name {
        font-size: clamp(1rem, 2.6vw, 1.35rem);
        font-weight: 700;
        color: #fff;
      }
      .scoring-meta {
        font-size: clamp(0.75rem, 1.9vw, 0.95rem);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.92);
        font-variant-numeric: tabular-nums;
        line-height: 1.25;
        white-space: nowrap;
      }
      .tournament-name {
        font-size: clamp(0.95rem, 2.6vw, 1.35rem);
        font-weight: 700;
        color: #fff;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tournament-stage {
        font-size: clamp(0.72rem, 2vw, 0.95rem);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.78);
        margin-top: 0.12rem;
        line-height: 1.25;
      }
      .row4 {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr);
        gap: 0;
        align-items: stretch;
      }
      .row3 {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 2fr);
        gap: 0;
        align-items: stretch;
      }
      .player-row.row4,
      .player-row.row3 {
        align-items: center;
      }
      .gcell {
        border-right: none;
        border-bottom: none;
        padding: 0.5rem 0.6rem;
        min-width: 0;
      }
      .stats-header {
        font-weight: 700;
        font-size: clamp(0.8rem, 2vw, 1.05rem);
        text-align: center;
        background: oklch(48% 0.17 16);
        border-bottom: 1px solid oklch(40% 0.14 16 / 0.9);
      }
      .stats-header .gcell { display: flex; align-items: center; justify-content: center; }
      .players-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .player-row {
        position: relative;
        flex: 1;
        min-height: 0;
        min-width: 0;
        background: oklch(14% 0.025 14 / 0.88);
        border-bottom: 1px solid oklch(51% 0.18 16 / 0.22);
        align-items: center;
      }
      .players-container .player-row:last-child {
        border-bottom: none;
        flex: 1;
      }
      .player-row .gcell-name {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
        min-width: 0;
      }
      .player-name-section {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
        width: 100%;
        max-width: 100%;
      }
      .player-name {
        font-size: clamp(1rem, 3.2vw, 1.65rem);
        font-weight: bold;
        color: #fff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        flex: 1;
      }
      .current-player-icon {
        width: 14px;
        height: 14px;
        background: #ef4444;
        border-radius: 0;
        margin-left: 0.35rem;
        flex-shrink: 0;
      }
      .starter-arrow {
        width: 22px;
        height: 22px;
        fill: rgba(255, 255, 255, 0.75);
        flex-shrink: 0;
      }
      .stat {
        font-size: clamp(1.1rem, 3.5vw, 1.85rem);
        font-weight: bold;
        text-align: center;
        color: #fff;
        font-variant-numeric: tabular-nums;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gcell-score-inner {
        text-align: right;
        min-width: 0;
        width: 100%;
      }
      .score {
        font-size: clamp(2rem, min(8vw, 12vh), 3.5rem);
        font-weight: bold;
        position: relative;
        color: #fff;
        font-variant-numeric: tabular-nums;
      }
      .darts-info {
        font-size: clamp(0.72rem, 1.8vw, 0.9rem);
        color: rgba(255, 255, 255, 0.75);
        margin-top: 0.12rem;
        font-variant-numeric: tabular-nums;
      }
      .throw-animation {
        position: absolute;
        top: -50px;
        right: 0;
        font-size: clamp(1.75rem, 5vw, 3rem);
        font-weight: bold;
        color: #ffffff;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        opacity: 0;
        animation: throwShow 1.5s ease-out;
        pointer-events: none;
      }
      @keyframes throwShow {
        0% { opacity: 0; transform: translateY(20px); }
        50% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-30px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .throw-animation { animation: none; opacity: 0.95; }
      }
      .upcoming-panel {
        display: none;
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;
        padding: 1rem 1.25rem 1.5rem;
        text-align: center;
        min-height: 0;
      }
      .upcoming-names {
        font-size: clamp(1rem, 2.8vw, 1.5rem);
        font-weight: 700;
        color: #fff;
        line-height: 1.3;
        max-width: 95vw;
      }
      .upcoming-msg {
        font-size: clamp(1.15rem, 3.5vw, 1.85rem);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.88);
        letter-spacing: 0.02em;
      }
      .sheet.mode-upcoming #live-scoreboard {
        display: none;
      }
      .sheet.mode-upcoming .upcoming-panel {
        display: flex;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="banner" id="banner" role="status" aria-live="polite">${waiting}</div>
      <div class="${sheetClass}">
        <div class="header-bar">
          <div class="header-left">
            <div class="brand-row">
              <img class="logo" src="${logo}" width="52" height="52" alt="" decoding="async" />
              <span class="brand-name">tDarts</span>
            </div>
          </div>
          <div class="header-center">
            <div class="tournament-name">${tn}</div>
            <div class="tournament-stage">${st}</div>
          </div>
          <div class="header-right">
            <div class="scoring-on-label">${scoringOn}</div>
            <div class="scoring-meta" id="scoring-meta">BO${bo} · ${initialLegTail}</div>
          </div>
        </div>

        <div class="upcoming-panel" id="upcoming-panel" aria-live="polite">
          <div class="upcoming-names">${upcomingVs}</div>
          <div class="upcoming-msg" id="upcoming-msg">${upcomingMsg}</div>
        </div>

        <div id="live-scoreboard">
        <div class="stats-header ${gridRowClass}">
          <div class="gcell" aria-hidden="true"></div>
          ${avgHeaderCell}
          <div class="gcell">${colLegs}</div>
          <div class="gcell">${colScore}</div>
        </div>

        <div class="players-container">
          <div class="player-row ${gridRowClass}" id="player1-row">
            <div class="gcell gcell-name">
              <div class="player-name-section">
                <div class="player-name" id="player1-name">${p1}</div>
              </div>
            </div>
            ${p1AvgCell}
            <div class="gcell stat" id="player1-legs">${init.p1LegsWon}</div>
            <div class="gcell gcell-score-inner">
              <div class="score" id="player1-score" aria-live="polite">${init.p1Remaining}</div>
              <div class="darts-info" id="player1-darts">(0)</div>
            </div>
          </div>

          <div class="player-row ${gridRowClass}" id="player2-row">
            <div class="gcell gcell-name">
              <div class="player-name-section">
                <div class="player-name" id="player2-name">${p2}</div>
              </div>
            </div>
            ${p2AvgCell}
            <div class="gcell stat" id="player2-legs">${init.p2LegsWon}</div>
            <div class="gcell gcell-score-inner">
              <div class="score" id="player2-score" aria-live="polite">${init.p2Remaining}</div>
              <div class="darts-info" id="player2-darts">(0)</div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
    <script>
(function () {
  var POLL_MS = 120;
  var INITIAL_UPCOMING = ${initialUpcoming ? "true" : "false"};
  var STREAM_LOCK_MATCH_ID = ${lockIdJs};
  var SHOW_AVG = ${showAvg ? "true" : "false"};
  var SCORING_LEG_TPL = ${legTplJs};
  var lastState = null;
  var lastLegNumber = 0;
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function openerStreamLockActive() {
    try {
      var o = window.opener;
      if (!o || o.closed) return false;
      return String(o.__tdartsStreamLockMatchId || "") === String(STREAM_LOCK_MATCH_ID);
    } catch (e) {
      return false;
    }
  }

  function openerSyncedToSelectedLegacy() {
    try {
      var o = window.opener;
      if (!o || o.closed) return false;
      return String(o.__tdartsLiveSelectedMatchId || "") === String(STREAM_LOCK_MATCH_ID);
    } catch (e) {
      return false;
    }
  }

  function getStreamLockMatchData() {
    try {
      var o = window.opener;
      if (!o || o.closed) return null;
      if (openerStreamLockActive()) return o.__tdartsLockedStreamData || null;
      if (openerSyncedToSelectedLegacy()) return o.matchData || null;
      return null;
    } catch (e) {
      return null;
    }
  }

  function getLockedStreamStateFromOpener() {
    try {
      var o = window.opener;
      if (!o || o.closed) return null;
      if (openerStreamLockActive()) {
        var st = o.__tdartsLockedStreamState;
        if (st && st.currentLegData) return st;
        return null;
      }
      if (openerSyncedToSelectedLegacy()) {
        var st2 = o.matchState;
        if (st2 && st2.currentLegData) return st2;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function stateIndicatesLive(st) {
    if (!st || !st.currentLegData) return false;
    var c = st.currentLegData;
    var t1 = (c.player1Throws && c.player1Throws.length) || 0;
    var t2 = (c.player2Throws && c.player2Throws.length) || 0;
    return t1 + t2 > 0;
  }

  function matchDataIndicatesLive(md) {
    if (!md || md.status === "pending") return false;
    if (md.status === "finished") return true;
    if (md.status !== "ongoing") return false;
    // As soon as the match is ongoing we should switch away from the "starting soon" screen,
    // even if no throws are present yet.
    return true;
  }

  function isLiveScoreboard() {
    var st = getLockedStreamStateFromOpener();
    var md = getStreamLockMatchData();
    if (stateIndicatesLive(st)) return true;
    if (matchDataIndicatesLive(md)) return true;
    return false;
  }

  function syncUpcomingVsLiveLayout() {
    if (!INITIAL_UPCOMING) return;
    var sheet = document.querySelector(".sheet");
    if (!sheet) return;
    if (isLiveScoreboard()) {
      sheet.classList.remove("mode-upcoming");
    } else {
      sheet.classList.add("mode-upcoming");
    }
  }

  function cloneState(state) {
    try {
      if (typeof structuredClone === "function") return structuredClone(state);
    } catch (e) {}
    try {
      return JSON.parse(JSON.stringify(state));
    } catch (e) {
      return state;
    }
  }

  function dartCountForThrows(throws) {
    if (!throws || !throws.length) return 0;
    var n = 0;
    for (var i = 0; i < throws.length; i++) {
      var d = throws[i].darts;
      n += d != null && d !== "" ? Number(d) : 3;
    }
    return n;
  }

  function aggregateMatchDartsAndScore(state) {
    var p1d = 0,
      p2d = 0,
      p1s = 0,
      p2s = 0;
    var cur = state.currentLegData || {};
    if (cur.player1Throws) {
      p1d += dartCountForThrows(cur.player1Throws);
      cur.player1Throws.forEach(function (t) {
        p1s += Number(t.score) || 0;
      });
    }
    if (cur.player2Throws) {
      p2d += dartCountForThrows(cur.player2Throws);
      cur.player2Throws.forEach(function (t) {
        p2s += Number(t.score) || 0;
      });
    }
    if (state.completedLegs && state.completedLegs.length) {
      state.completedLegs.forEach(function (leg) {
        if (leg.player1Throws) {
          p1d += dartCountForThrows(leg.player1Throws);
          leg.player1Throws.forEach(function (t) {
            p1s += Number(t.score) || 0;
          });
        }
        if (leg.player2Throws) {
          p2d += dartCountForThrows(leg.player2Throws);
          leg.player2Throws.forEach(function (t) {
            p2s += Number(t.score) || 0;
          });
        }
      });
    }
    return { p1d: p1d, p2d: p2d, p1s: p1s, p2s: p2s };
  }

  function threeDartAvg(totalScore, totalDarts) {
    if (!totalDarts || totalDarts <= 0) return "0.00";
    return ((totalScore / totalDarts) * 3).toFixed(2);
  }

  function formatBoardName(fullName) {
    var s = String(fullName || "").trim();
    if (!s) return "";
    var parts = s.split(/\\s+/).filter(function (x) {
      return x.length > 0;
    });
    var out;
    if (parts.length === 1) {
      out = parts[0];
    } else {
      var last = parts.pop();
      var initials = parts.map(function (p) {
        return p.charAt(0).toUpperCase() + ".";
      });
      out = initials.concat(last).join(" ");
    }
    var max = 40;
    if (out.length <= max) return out;
    return out.slice(0, max - 1) + "\u2026";
  }

  function syncNamesFromDisplay(state) {
    try {
      var md = getStreamLockMatchData();
      function n1(ms) {
        if (ms && ms.player1Name) return String(ms.player1Name);
        if (md && md.player1 && md.player1.playerId && md.player1.playerId.name) return String(md.player1.playerId.name);
        return null;
      }
      function n2(ms) {
        if (ms && ms.player2Name) return String(ms.player2Name);
        if (md && md.player2 && md.player2.playerId && md.player2.playerId.name) return String(md.player2.playerId.name);
        return null;
      }
      var e1 = document.getElementById("player1-name");
      var e2 = document.getElementById("player2-name");
      var a = n1(state);
      var b = n2(state);
      if (a && e1) e1.textContent = formatBoardName(a);
      if (b && e2) e2.textContent = formatBoardName(b);
    } catch (err) {}
  }

  function setBanner(on) {
    var b = document.getElementById("banner");
    if (!b) return;
    b.classList.toggle("on", !!on);
  }

  function updateDisplay(state) {
    if (!state || !state.currentLegData) return;

    var player1Score = document.getElementById("player1-score");
    var player2Score = document.getElementById("player2-score");
    var player1Row = document.getElementById("player1-row");
    var player2Row = document.getElementById("player2-row");
    setBanner(false);

    if (lastState && lastState.currentLegData) {
      var prev1 = lastState.currentLegData.player1Remaining;
      var next1 = state.currentLegData.player1Remaining;
      if (prev1 !== next1) {
        var tv1 = prev1 - next1;
        if (tv1 > 0 && tv1 <= 180) showThrowAnimation(player1Score, tv1);
      }
      var prev2 = lastState.currentLegData.player2Remaining;
      var next2 = state.currentLegData.player2Remaining;
      if (prev2 !== next2) {
        var tv2 = prev2 - next2;
        if (tv2 > 0 && tv2 <= 180) showThrowAnimation(player2Score, tv2);
      }
    }

    player1Score.textContent = state.currentLegData.player1Remaining;
    player2Score.textContent = state.currentLegData.player2Remaining;

    updateIndicators(state, player1Row, player2Row);

    document.getElementById("player1-legs").textContent = state.player1LegsWon || 0;
    document.getElementById("player2-legs").textContent = state.player2LegsWon || 0;

    updateDartCounters(state);

    var sub = document.getElementById("scoring-meta");
    if (sub) {
      var bo = (state.legsToWin || 3) * 2 - 1;
      var legPart = SCORING_LEG_TPL.split("__LEG__").join(String(state.currentLeg || 1));
      sub.textContent = "BO" + bo + " · " + legPart;
    }

    syncNamesFromDisplay(state);
    lastState = cloneState(state);
  }

  function updateIndicators(state, player1Row, player2Row) {
    var player1Section = player1Row.querySelector(".player-name-section");
    var player2Section = player2Row.querySelector(".player-name-section");

    var currentLegNumber = state.currentLeg || 1;
    var legChanged = lastLegNumber !== currentLegNumber;
    if (legChanged) {
      lastLegNumber = currentLegNumber;
      player1Section.querySelectorAll(".starter-arrow").forEach(function (el) {
        el.remove();
      });
      player2Section.querySelectorAll(".starter-arrow").forEach(function (el) {
        el.remove();
      });
    }

    var legStarter = 1;

    try {
      if (currentLegNumber === 1) {
        var ini = state.initialStartingPlayer;
        if (ini === 1 || ini === 2) {
          legStarter = ini;
        } else {
          var md0 = getStreamLockMatchData();
          if (md0) legStarter = md0.startingPlayer || 1;
        }
      } else {
        var matchData = getStreamLockMatchData();
        if (matchData) {
          if (matchData.legs && matchData.legs.length > 0) {
            var lastCompletedLeg = matchData.legs[matchData.legs.length - 1];

            if (lastCompletedLeg.player1Throws && lastCompletedLeg.player2Throws) {
              var p1Throws = lastCompletedLeg.player1Throws.length;
              var p2Throws = lastCompletedLeg.player2Throws.length;

              var lastLegStarter;
              if (p1Throws > p2Throws) lastLegStarter = 1;
              else if (p2Throws > p1Throws) lastLegStarter = 2;
              else lastLegStarter = 1;

              legStarter = lastLegStarter === 1 ? 2 : 1;
            } else {
              legStarter =
                matchData.startingPlayer === 1
                  ? currentLegNumber % 2 === 1
                    ? 1
                    : 2
                  : currentLegNumber % 2 === 1
                    ? 2
                    : 1;
            }
          } else {
            legStarter =
              matchData.startingPlayer === 1
                ? currentLegNumber % 2 === 1
                  ? 1
                  : 2
                : currentLegNumber % 2 === 1
                  ? 2
                  : 1;
          }
        }
      }
    } catch (e) {
      console.log("Could not access matchData from parent:", e);
    }

    if (!player1Section.querySelector(".starter-arrow") && !player2Section.querySelector(".starter-arrow")) {
      var arrowSvg =
        '<svg class="starter-arrow" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2L2 19.5h20L12 2z"></path></svg>';

      if (legStarter === 1) player1Section.insertAdjacentHTML("afterbegin", arrowSvg);
      else player2Section.insertAdjacentHTML("afterbegin", arrowSvg);
    }

    player1Section.querySelectorAll(".current-player-icon").forEach(function (el) {
      el.remove();
    });
    player2Section.querySelectorAll(".current-player-icon").forEach(function (el) {
      el.remove();
    });

    var currentDot = '<span class="current-player-icon" aria-hidden="true"></span>';

    if (state.currentLegData.currentPlayer === 1) player1Section.insertAdjacentHTML("beforeend", currentDot);
    else player2Section.insertAdjacentHTML("beforeend", currentDot);
  }

  function showThrowAnimation(scoreEl, throwValue) {
    if (reduceMotion) return;
    var row = scoreEl && scoreEl.closest && scoreEl.closest(".player-row");
    if (!row) return;
    var animation = document.createElement("div");
    animation.className = "throw-animation";
    animation.textContent = "-" + throwValue;
    row.appendChild(animation);
    setTimeout(function () {
      animation.remove();
    }, 1500);
  }

  function updateDartCounters(state) {
    var agg = aggregateMatchDartsAndScore(state);
    var cur = state.currentLegData || {};

    var p1LegDarts = dartCountForThrows(cur.player1Throws);
    var p2LegDarts = dartCountForThrows(cur.player2Throws);

    document.getElementById("player1-darts").textContent = "(" + p1LegDarts + ")";
    document.getElementById("player2-darts").textContent = "(" + p2LegDarts + ")";
    if (SHOW_AVG) {
      var p1AvgEl = document.getElementById("player1-avg");
      var p2AvgEl = document.getElementById("player2-avg");
      if (p1AvgEl) p1AvgEl.textContent = threeDartAvg(agg.p1s, agg.p1d);
      if (p2AvgEl) p2AvgEl.textContent = threeDartAvg(agg.p2s, agg.p2d);
    }
  }

  function tick() {
    if (!window.opener || window.opener.closed) {
      setBanner(true);
      return;
    }
    try {
      syncUpcomingVsLiveLayout();
      var openerState = getLockedStreamStateFromOpener();
      var live = isLiveScoreboard();

      if (live && openerState && openerState.currentLegData) {
        setBanner(false);
        updateDisplay(openerState);
        return;
      }

      if (INITIAL_UPCOMING) {
        var sheet = document.querySelector(".sheet");
        if (sheet && sheet.classList.contains("mode-upcoming")) {
          setBanner(false);
          return;
        }
      }

      if (openerState && openerState.currentLegData) {
        setBanner(false);
        updateDisplay(openerState);
        return;
      }
      setBanner(true);
    } catch (e) {
      setBanner(true);
    }
  }

  tick();
  setInterval(tick, POLL_MS);
})();
    <\/script>
  </body>
</html>`;
}
