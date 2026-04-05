const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const workspaceRoot = process.cwd();
for (const envFile of ['.env.load-test', '.env']) {
  const envPath = path.join(workspaceRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3000';
const LOAD_TEST_SECRET = process.env.LOAD_TEST_SECRET || '';
const LOAD_TEST_CLUB_ID = process.env.LOAD_TEST_CLUB_ID || '68f6afb145352f8e4076ed55';
const TOURNAMENT_POOL_SIZE = Number(process.env.LOAD_TOURNAMENT_POOL_SIZE || 4);
const TARGET_MIN_PLAYERS = Number(process.env.LOAD_TOURNAMENT_MIN_PLAYERS || 12);
const TARGET_MAX_PLAYERS = Number(process.env.LOAD_TOURNAMENT_MAX_PLAYERS || 20);
const PLAYER_ADD_CHUNK_MAX = Number(process.env.LOAD_PLAYER_ADD_CHUNK_MAX || 1);
const LIFECYCLE_INTERVAL_MS = Number(process.env.LOAD_LIFECYCLE_INTERVAL_MS || 3500);
const MAX_GLOBAL_ADD_PLAYER_IN_FLIGHT = Number(process.env.LOAD_MAX_GLOBAL_ADD_PLAYER_IN_FLIGHT || 6);
const MAX_PER_TOURNAMENT_ADD_PLAYER_IN_FLIGHT = Number(
  process.env.LOAD_MAX_PER_TOURNAMENT_ADD_PLAYER_IN_FLIGHT || 1
);
const MAX_GLOBAL_CHECKIN_IN_FLIGHT = Number(process.env.LOAD_MAX_GLOBAL_CHECKIN_IN_FLIGHT || 2);
const MAX_PER_TOURNAMENT_CHECKIN_IN_FLIGHT = Number(
  process.env.LOAD_MAX_PER_TOURNAMENT_CHECKIN_IN_FLIGHT || 1
);
const THINK_MIN_SECONDS = Number(process.env.LOAD_THINK_MIN_SECONDS || 1);
const THINK_MAX_SECONDS = Number(process.env.LOAD_THINK_MAX_SECONDS || 3);
const CAPTURE_WEB_VITALS = String(process.env.LOAD_CAPTURE_WEB_VITALS || 'true').toLowerCase() !== 'false';
const WEB_VITALS_TIMEOUT_MS = Number(process.env.LOAD_WEB_VITALS_TIMEOUT_MS || 25000);

function ensureRequiredEnv() {
  const missing = [];
  if (!LOAD_TEST_SECRET) missing.push('LOAD_TEST_SECRET');
  if (!process.env.LOAD_TEST_MODE) missing.push('LOAD_TEST_MODE');
  if (!process.env.LOAD_TEST_USER_ID) missing.push('LOAD_TEST_USER_ID');
  if (!process.env.LOAD_TEST_CLUB_ID) missing.push('LOAD_TEST_CLUB_ID');

  if (missing.length) {
    throw new Error(
      `Missing required load-test environment variables: ${missing.join(', ')}. ` +
        `Create .env.load-test from .env.load-test.example and restart both dev server and load test.`
    );
  }

  try {
    new URL(BASE_URL);
  } catch {
    throw new Error(
      `Invalid LOAD_BASE_URL: "${BASE_URL}". Provide a full URL like http://localhost:3000.`
    );
  }
}

ensureRequiredEnv();

const sharedState = {
  tournamentCodes: [],
  playerTargets: new Map(),
  playerAdded: new Map(),
  groupGenerated: new Set(),
  knockoutGenerated: new Set(),
  lifecycleBusy: new Set(),
  nextLifecycleAt: new Map(),
  bootstrapPromise: null,
  browserVitalsPromise: null,
  browserVitalsCaptured: false,
  actionInFlightGlobal: new Map(),
  actionInFlightByTournament: new Map(),
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomThinkSeconds() {
  const min = Number.isFinite(THINK_MIN_SECONDS) ? THINK_MIN_SECONDS : 0;
  const max = Number.isFinite(THINK_MAX_SECONDS) ? THINK_MAX_SECONDS : 2;
  const normalizedMin = Math.max(0, Math.floor(Math.min(min, max)));
  const normalizedMax = Math.max(normalizedMin, Math.floor(Math.max(min, max)));
  return randomInt(normalizedMin, normalizedMax);
}

function buildHeaders() {
  return {
    'content-type': 'application/json',
    'x-load-test-secret': LOAD_TEST_SECRET,
  };
}

function normalizePathForMetric(urlPath) {
  return urlPath.replace(/\/[a-zA-Z0-9_-]{6,}$/g, '/{id}');
}

async function getPlaywrightChromium() {
  try {
    const playwright = require('playwright');
    if (playwright?.chromium) return playwright.chromium;
  } catch {}

  try {
    const playwrightTest = require('@playwright/test');
    if (playwrightTest?.chromium) return playwrightTest.chromium;
  } catch {}

  return null;
}

async function sampleBrowserVitals(events) {
  if (!CAPTURE_WEB_VITALS) return;
  if (sharedState.browserVitalsCaptured) return;

  if (!sharedState.browserVitalsPromise) {
    sharedState.browserVitalsPromise = (async () => {
      const chromium = await getPlaywrightChromium();
      if (!chromium) {
        events?.emit('counter', 'browser.vitals.skipped_playwright_missing', 1);
        return;
      }

      const code = sharedState.tournamentCodes[0];
      const paths = ['/en', '/en/home', '/en/search'];
      if (code) {
        paths.push(`/en/tournaments/${code}`);
      }

      let browser;
      try {
        browser = await chromium.launch({ headless: true, timeout: WEB_VITALS_TIMEOUT_MS });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.addInitScript(() => {
          window.__ltVitals = { fcp: null, lcp: null, inp: null };

          try {
            const lcpObserver = new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              const lastEntry = entries[entries.length - 1];
              if (lastEntry) {
                window.__ltVitals.lcp = lastEntry.startTime;
              }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch {}
        });

        for (const routePath of paths) {
          const url = `${BASE_URL}${routePath}`;
          const response = await page.goto(url, { waitUntil: 'load', timeout: WEB_VITALS_TIMEOUT_MS });
          await page.waitForTimeout(1200);
          await page.mouse.click(10, 10).catch(() => {});
          await page.waitForTimeout(250);

          const vitals = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const paints = performance.getEntriesByType('paint');
            const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime || null;
            const lcp =
              window.__ltVitals?.lcp ||
              performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime ||
              null;
            const eventEntries = performance
              .getEntriesByType('event')
              .filter((entry) => entry.name === 'click' || entry.name === 'pointerdown');
            const inp = eventEntries.length
              ? Math.max(...eventEntries.map((entry) => Number(entry.duration || 0)))
              : null;
            const ttfb = nav ? Number(nav.responseStart) : null;
            return { fcp, lcp, inp, ttfb };
          });

          const label = normalizePathForMetric(routePath);
          if (typeof vitals.ttfb === 'number' && Number.isFinite(vitals.ttfb)) {
            events?.emit('histogram', 'browser.ttfb_ms', vitals.ttfb);
            events?.emit('histogram', `browser.ttfb_ms.${label}`, vitals.ttfb);
          }
          if (typeof vitals.fcp === 'number' && Number.isFinite(vitals.fcp)) {
            events?.emit('histogram', 'browser.fcp_ms', vitals.fcp);
            events?.emit('histogram', `browser.fcp_ms.${label}`, vitals.fcp);
          }
          if (typeof vitals.lcp === 'number' && Number.isFinite(vitals.lcp)) {
            events?.emit('histogram', 'browser.lcp_ms', vitals.lcp);
            events?.emit('histogram', `browser.lcp_ms.${label}`, vitals.lcp);
          }
          if (typeof vitals.inp === 'number' && Number.isFinite(vitals.inp) && vitals.inp > 0) {
            events?.emit('histogram', 'browser.inp_ms', vitals.inp);
            events?.emit('histogram', `browser.inp_ms.${label}`, vitals.inp);
          } else {
            events?.emit('counter', 'browser.inp.unavailable', 1);
          }
          if (response?.ok()) {
            events?.emit('counter', 'browser.vitals.pages_sampled', 1);
          }
        }

        sharedState.browserVitalsCaptured = true;
      } catch {
        events?.emit('counter', 'browser.vitals.capture_failures', 1);
      } finally {
        if (browser) {
          await browser.close().catch(() => {});
        }
      }
    })();
  }

  await sharedState.browserVitalsPromise;
}

function getTournamentActionMap(actionKey) {
  if (!sharedState.actionInFlightByTournament.has(actionKey)) {
    sharedState.actionInFlightByTournament.set(actionKey, new Map());
  }
  return sharedState.actionInFlightByTournament.get(actionKey);
}

async function runWithThrottle(
  actionKey,
  tournamentCode,
  events,
  {
    globalLimit,
    perTournamentLimit,
    waitMs = 50,
  },
  task
) {
  const perTournamentMap = getTournamentActionMap(actionKey);
  while (true) {
    const globalInFlight = sharedState.actionInFlightGlobal.get(actionKey) || 0;
    const tournamentInFlight = perTournamentMap.get(tournamentCode) || 0;
    if (globalInFlight < globalLimit && tournamentInFlight < perTournamentLimit) {
      sharedState.actionInFlightGlobal.set(actionKey, globalInFlight + 1);
      perTournamentMap.set(tournamentCode, tournamentInFlight + 1);
      break;
    }
    if (events) {
      events.emit('counter', `loadtest.${actionKey}.throttle_waits`, 1);
    }
    await sleep(waitMs);
  }

  try {
    return await task();
  } finally {
    const globalInFlight = sharedState.actionInFlightGlobal.get(actionKey) || 0;
    if (globalInFlight <= 1) {
      sharedState.actionInFlightGlobal.delete(actionKey);
    } else {
      sharedState.actionInFlightGlobal.set(actionKey, globalInFlight - 1);
    }

    const tournamentInFlight = perTournamentMap.get(tournamentCode) || 0;
    if (tournamentInFlight <= 1) {
      perTournamentMap.delete(tournamentCode);
    } else {
      perTournamentMap.set(tournamentCode, tournamentInFlight - 1);
    }
  }
}

async function apiPost(action, payload, events, metricPrefix) {
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}/api/load-test/${action}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload || {}),
  });
  const elapsed = Date.now() - startedAt;
  const bodyText = await response.text().catch(() => '');
  const data = bodyText ? JSON.parse(bodyText) : {};
  const payloadBytes = Buffer.byteLength(bodyText, 'utf8');

  if (events && metricPrefix) {
    events.emit('histogram', `${metricPrefix}.latency_ms`, elapsed);
    events.emit('histogram', `${metricPrefix}.response_bytes`, payloadBytes);
    events.emit('counter', `${metricPrefix}.requests`, 1);
    if (!response.ok) {
      events.emit('counter', `${metricPrefix}.errors`, 1);
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(`${action} failed: ${message}`);
  }

  return data;
}

function pickTournamentCode() {
  if (!sharedState.tournamentCodes.length) {
    return null;
  }
  return sharedState.tournamentCodes[randomInt(0, sharedState.tournamentCodes.length - 1)];
}

async function ensureTournamentPool(events) {
  if (sharedState.tournamentCodes.length >= TOURNAMENT_POOL_SIZE) {
    return;
  }

  if (!sharedState.bootstrapPromise) {
    sharedState.bootstrapPromise = (async () => {
      while (sharedState.tournamentCodes.length < TOURNAMENT_POOL_SIZE) {
        const index = sharedState.tournamentCodes.length + 1;
        const created = await apiPost(
          'create-tournament',
          {
            name: `LT Sandbox ${index} ${Date.now()}`,
            boardsCount: randomInt(6, 12),
            maxPlayers: TARGET_MAX_PLAYERS,
            format: 'group_knockout',
            startingScore: 501,
            participationMode: 'individual',
            startDate: new Date().toISOString(),
          },
          events,
          'loadtest.create_tournament'
        );
        const code = created?.tournamentCode;
        if (!code) {
          throw new Error('create-tournament did not return tournamentCode');
        }
        sharedState.tournamentCodes.push(code);
        sharedState.playerTargets.set(code, randomInt(TARGET_MIN_PLAYERS, TARGET_MAX_PLAYERS));
        sharedState.playerAdded.set(code, 0);
      }
    })();
  }

  try {
    await sharedState.bootstrapPromise;
  } finally {
    sharedState.bootstrapPromise = null;
  }
}

function removeTournamentState(tournamentCode) {
  sharedState.tournamentCodes = sharedState.tournamentCodes.filter((code) => code !== tournamentCode);
  sharedState.playerTargets.delete(tournamentCode);
  sharedState.playerAdded.delete(tournamentCode);
  sharedState.groupGenerated.delete(tournamentCode);
  sharedState.knockoutGenerated.delete(tournamentCode);
  sharedState.lifecycleBusy.delete(tournamentCode);
  sharedState.nextLifecycleAt.delete(tournamentCode);
}

async function addPlayersChunk(tournamentCode, events) {
  const target = sharedState.playerTargets.get(tournamentCode) || TARGET_MAX_PLAYERS;
  const current = sharedState.playerAdded.get(tournamentCode) || 0;
  if (current >= target) {
    return;
  }

  const chunk = Math.min(randomInt(1, Math.max(1, PLAYER_ADD_CHUNK_MAX)), target - current);
  for (let i = 0; i < chunk; i++) {
    const name = `LT Player ${tournamentCode}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    try {
      await runWithThrottle(
        'add_player',
        tournamentCode,
        events,
        {
          globalLimit: MAX_GLOBAL_ADD_PLAYER_IN_FLIGHT,
          perTournamentLimit: MAX_PER_TOURNAMENT_ADD_PLAYER_IN_FLIGHT,
        },
        () =>
          apiPost(
            'add-player',
            { tournamentCode, playerName: name },
            events,
            'loadtest.add_player'
          )
      );
      sharedState.playerAdded.set(tournamentCode, (sharedState.playerAdded.get(tournamentCode) || 0) + 1);
    } catch {
      events.emit('counter', 'loadtest.add_player.failures', 1);
    }
  }
}

async function ensureGroupStage(tournamentCode, events) {
  if (sharedState.groupGenerated.has(tournamentCode)) {
    return true;
  }

  const currentPlayers = sharedState.playerAdded.get(tournamentCode) || 0;
  const minPlayersBeforeGroups = Math.min(
    TARGET_MIN_PLAYERS,
    sharedState.playerTargets.get(tournamentCode) || TARGET_MIN_PLAYERS
  );
  if (currentPlayers < minPlayersBeforeGroups) {
    events.emit('counter', 'loadtest.groups.deferred_insufficient_players', 1);
    return false;
  }

  try {
    await runWithThrottle(
      'checkin_all_players',
      tournamentCode,
      events,
      {
        globalLimit: MAX_GLOBAL_CHECKIN_IN_FLIGHT,
        perTournamentLimit: MAX_PER_TOURNAMENT_CHECKIN_IN_FLIGHT,
      },
      () =>
        apiPost(
          'check-in-all-players',
          { tournamentCode },
          events,
          'loadtest.checkin_all_players'
        )
    );
    await apiPost(
      'generate-groups',
      { tournamentCode },
      events,
      'loadtest.generate_groups'
    );
    sharedState.groupGenerated.add(tournamentCode);
    events.emit('counter', 'loadtest.groups.generated', 1);
    return true;
  } catch {
    return false;
  }
}

async function maybeGenerateKnockout(tournamentCode, events) {
  if (sharedState.knockoutGenerated.has(tournamentCode)) {
    return true;
  }
  if (!sharedState.groupGenerated.has(tournamentCode)) {
    events.emit('counter', 'loadtest.knockout.deferred_groups_missing', 1);
    return false;
  }

  let tournamentState;
  try {
    tournamentState = await apiPost(
      'get-tournament',
      { tournamentCode },
      events,
      'loadtest.get_tournament'
    );
  } catch {
    return false;
  }

  const format = tournamentState?.format;
  if (format !== 'group_knockout') {
    sharedState.knockoutGenerated.add(tournamentCode);
    return true;
  }

  let summary;
  try {
    summary = await apiPost(
      'list-matches',
      { tournamentCode, summaryOnly: true },
      events,
      'loadtest.list_matches'
    );
  } catch {
    return false;
  }

  const counts = summary?.counts || {};
  const unfinished = Number(counts.pending || 0) + Number(counts.ongoing || 0);
  const total = Number(counts.total || 0);
  if (total === 0 || unfinished > 0) {
    events.emit('counter', 'loadtest.knockout.deferred_group_matches_remaining', 1);
    return false;
  }

  try {
    await apiPost(
      'generate-knockout',
      { tournamentCode, selectedPlayers: 16 },
      events,
      'loadtest.generate_knockout'
    );
    sharedState.knockoutGenerated.add(tournamentCode);
    events.emit('counter', 'loadtest.knockout.generated', 1);
    return true;
  } catch (error) {
    events.emit('counter', 'loadtest.knockout.generate_failures', 1);
    if (events && error?.message) {
      events.emit('counter', 'loadtest.knockout.error_seen', 1);
    }
    return false;
  }
}

async function maybeFinishTournament(tournamentCode, events) {
  if (!sharedState.knockoutGenerated.has(tournamentCode)) {
    events.emit('counter', 'loadtest.finish_tournament.deferred_knockout_missing', 1);
    return;
  }

  let list;
  try {
    list = await apiPost(
      'list-matches',
      { tournamentCode, summaryOnly: true },
      events,
      'loadtest.list_matches'
    );
  } catch {
    return;
  }

  const counts = list?.counts || {};
  const totalMatches = Number(counts.total || 0);
  const unfinished = Number(counts.pending || 0) + Number(counts.ongoing || 0);
  if (!totalMatches) {
    events.emit('counter', 'loadtest.finish_tournament.deferred_no_matches', 1);
    return;
  }
  if (unfinished > 0) {
    events.emit('counter', 'loadtest.finish_tournament.deferred_unfinished_matches', 1);
    return;
  }

  try {
    await runWithThrottle(
      'checkin_all_players',
      tournamentCode,
      events,
      {
        globalLimit: MAX_GLOBAL_CHECKIN_IN_FLIGHT,
        perTournamentLimit: MAX_PER_TOURNAMENT_CHECKIN_IN_FLIGHT,
      },
      () =>
        apiPost(
          'check-in-all-players',
          { tournamentCode },
          events,
          'loadtest.checkin_all_players'
        )
    );
    await apiPost(
      'finish-tournament',
      { tournamentCode },
      events,
      'loadtest.finish_tournament'
    );
    events.emit('counter', 'loadtest.tournaments.finished', 1);
    removeTournamentState(tournamentCode);
    await ensureTournamentPool(events);
  } catch {
    events.emit('counter', 'loadtest.finish_tournament.failures', 1);
  }
}

async function runBoardUpdateCycle(tournamentCode, events) {
  let list;
  try {
    list = await apiPost(
      'list-matches',
      { tournamentCode, statuses: ['pending', 'ongoing'], limit: 120 },
      events,
      'loadtest.list_matches'
    );
  } catch {
    return;
  }

  const matches = Array.isArray(list?.matches) ? list.matches : [];
  const pending = matches.filter((m) => m.status === 'pending');
  const ongoing = matches.filter((m) => m.status === 'ongoing');

  const startBatch = pending.slice(0, randomInt(1, 3));
  for (const match of startBatch) {
    try {
      await apiPost(
        'start-match',
        {
          tournamentCode,
          matchId: match.id,
          boardNumber: Number(match.boardReference || 1),
          legsToWin: 3,
          startingPlayer: randomInt(1, 2),
        },
        events,
        'loadtest.start_match'
      );
    } catch {
      events.emit('counter', 'loadtest.start_match.failures', 1);
    }
  }

  const finishBatch = ongoing.slice(0, randomInt(1, 3));
  for (const match of finishBatch) {
    try {
      let player1LegsWon = randomInt(1, 3);
      let player2LegsWon = randomInt(0, 3);
      if (player1LegsWon === player2LegsWon) {
        player2LegsWon = Math.max(0, player2LegsWon - 1);
      }
      await apiPost(
        'finish-match',
        {
          matchId: match.id,
          player1LegsWon,
          player2LegsWon,
        },
        events,
        'loadtest.finish_match'
      );
      await apiPost(
        'update-board-status',
        { matchId: match.id },
        events,
        'loadtest.update_board_status'
      );
    } catch {
      events.emit('counter', 'loadtest.finish_or_board_update.failures', 1);
    }
  }

  events.emit('counter', 'loadtest.board_update_cycles', 1);
}

module.exports = {
  capturePageMetrics(req, res, userContext, events, done) {
    const ttfb = res.timings?.phases?.firstByte || null;
    const url = req.url || '';
    const pathLabel = url.replace(/\/[a-zA-Z0-9_-]{6,}$/g, '/{id}').replace(/^https?:\/\/[^/]+/, '');
    const contentLength = Number(res.headers?.['content-length']) || 0;

    if (ttfb !== null) {
      events.emit('histogram', 'page.ttfb_ms', ttfb);
      events.emit('histogram', `page.ttfb_ms.${pathLabel}`, ttfb);
    }
    if (contentLength > 0) {
      events.emit('histogram', 'page.response_bytes', contentLength);
      events.emit('histogram', `page.response_bytes.${pathLabel}`, contentLength);
    }
    events.emit('counter', 'page.requests', 1);
    done();
  },

  async bootstrapTournaments(userContext, events) {
    await ensureTournamentPool(events);
    await sampleBrowserVitals(events);
    userContext.vars.tournamentCount = sharedState.tournamentCodes.length;
  },

  async setupLoadTestAuth(userContext, events) {
    await ensureTournamentPool(events);
    userContext.vars.loadClubId = LOAD_TEST_CLUB_ID;
    userContext.vars.loadHeaders = JSON.stringify(buildHeaders());
    userContext.vars.thinkSec = randomThinkSeconds();
  },

  async pickTournamentContext(userContext) {
    const code = pickTournamentCode();
    userContext.vars.tournamentCode = code || 'DEMO';
    userContext.vars.thinkSec = randomThinkSeconds();
  },

  async lifecycleStep(userContext, events) {
    await ensureTournamentPool(events);
    const tournamentCode = userContext.vars.tournamentCode || pickTournamentCode();
    if (!tournamentCode) {
      return;
    }

    const now = Date.now();
    const nextAllowedAt = sharedState.nextLifecycleAt.get(tournamentCode) || 0;
    if (now < nextAllowedAt) {
      events.emit('counter', 'loadtest.lifecycle.deferred_cooldown', 1);
      return;
    }
    if (sharedState.lifecycleBusy.has(tournamentCode)) {
      events.emit('counter', 'loadtest.lifecycle.deferred_busy', 1);
      return;
    }
    sharedState.lifecycleBusy.add(tournamentCode);
    sharedState.nextLifecycleAt.set(tournamentCode, now + LIFECYCLE_INTERVAL_MS);

    try {
      await addPlayersChunk(tournamentCode, events);
      const groupReady = await ensureGroupStage(tournamentCode, events);
      if (!groupReady) {
        return;
      }

      const groupCycles = randomInt(1, 2);
      for (let i = 0; i < groupCycles; i++) {
        await runBoardUpdateCycle(tournamentCode, events);
        await sleep(randomInt(300, 1200));
      }

      const knockoutReady = await maybeGenerateKnockout(tournamentCode, events);
      if (knockoutReady) {
        const knockoutCycles = randomInt(1, 2);
        for (let i = 0; i < knockoutCycles; i++) {
          await runBoardUpdateCycle(tournamentCode, events);
          await sleep(randomInt(300, 1200));
        }
      }

      await maybeFinishTournament(tournamentCode, events);
    } finally {
      sharedState.lifecycleBusy.delete(tournamentCode);
    }
  },

  async browsePrep(userContext) {
    const code = pickTournamentCode();
    userContext.vars.tournamentCode = code || 'DEMO';
    userContext.vars.thinkSec = randomThinkSeconds();
  },
};
