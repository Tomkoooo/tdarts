export type TvBaseSlideType =
  | "rankings"
  | "groups"
  | "boardStatus"
  | "knockoutLeft"
  | "knockoutRight"
  | "knockoutFinal";

export type TvSlideType = TvBaseSlideType | "milestoneFlash" | "boardUrgent" | "fallback";

export interface SlideDefinition {
  id: string;
  type: TvSlideType;
  kind: "base" | "urgent" | "fallback";
  durationMs?: number;
  payload?: Record<string, unknown>;
}

export interface UrgentEvent {
  id: string;
  type: "milestoneFlash" | "boardUrgent";
  createdAt: number;
  cooldownKey: string;
  durationMs?: number;
  payload?: Record<string, unknown>;
}

export interface TvSettings {
  enabledSlides: Record<TvBaseSlideType, boolean>;
  baseIntervalMs: number;
  urgentIntervalMs: number;
  perSlideDurationMs: Partial<Record<TvBaseSlideType, number>>;
  maxConsecutiveUrgent: number;
  knockoutSplitThreshold: number;
  highAlertInterrupts: boolean;
  boardUrgencyEnabled: boolean;
  milestoneUrgencyEnabled: boolean;
  freezeBaseRotation: boolean;
  showQr: boolean;
}

export interface PlayerRankingRow {
  playerId: string;
  name: string;
  value: number;
  /** Local wall time, e.g. (14:05) */
  timeLabel?: string;
}

/** Lean match shape from getTvRankingLegMatches (serialized to client). */
export type TvLegMatchLite = {
  player1?: { playerId?: unknown };
  player2?: { playerId?: unknown };
  legs?: Array<{
    createdAt?: string | Date;
    player1Throws?: Array<{ score?: number }>;
    player2Throws?: Array<{ score?: number }>;
    winnerId?: unknown;
    checkoutScore?: number;
  }>;
};

export interface BoardWaitingRow {
  boardNumber: number;
  player1Name: string;
  player2Name: string;
  scorerName?: string;
}

export interface BoardSummary {
  waitingBoards: BoardWaitingRow[];
  waitingCount: number;
  playingCount: number;
  idleCount: number;
  totalCount: number;
}

export interface GroupStandingRow {
  playerId: string;
  name: string;
  standing: number;
  points: number;
  legs: number;
}

export interface GroupDisplay {
  id: string;
  label: string;
  boardNumber: number;
  rows: GroupStandingRow[];
}

export interface KnockoutMatchDisplay {
  id: string;
  boardLabel: string;
  status: string;
  player1Name: string;
  player2Name: string;
  player1Legs: number;
  player2Legs: number;
  scorerName?: string;
}

export interface KnockoutRoundDisplay {
  id: string;
  label: string;
  matches: KnockoutMatchDisplay[];
}

export interface KnockoutDisplay {
  shouldSplit: boolean;
  leftRounds: KnockoutRoundDisplay[];
  rightRounds: KnockoutRoundDisplay[];
  allRounds: KnockoutRoundDisplay[];
  finalMatch?: KnockoutMatchDisplay;
}

export interface MilestoneSnapshot {
  topCheckout: number;
  topCheckoutPlayer: string;
  total180: number;
  leader180: string;
}

const now = () => Date.now();

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const playerNameFromRef = (value: any, fallback = "TBD") =>
  asString(value?.name || value?.playerId?.name || value?.playerReference?.name) || fallback;

const toRoundLabel = (index: number, totalRounds: number) => {
  const roundsFromEnd = totalRounds - index;
  if (roundsFromEnd === 1) return "Final";
  if (roundsFromEnd === 2) return "Semifinal";
  if (roundsFromEnd === 3) return "Quarterfinal";
  return `Round ${index + 1}`;
};

export function normalizeMongoId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null && "_id" in ref) {
    const id = (ref as { _id?: unknown })._id;
    return id != null ? String(id) : "";
  }
  return String(ref);
}

function legTimeMs(leg: { createdAt?: string | Date }): number {
  const t = leg.createdAt;
  if (t == null) return Number.NaN;
  const ms = new Date(t as string | Date).getTime();
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function formatBracketedHm(ms: number): string {
  const d = new Date(ms);
  return `(${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")})`;
}

/** Per Player ObjectId: sorted 180 timestamps and checkout events (by time). */
export function buildTvPlayerLegMeta(matches: TvLegMatchLite[] | undefined | null): Map<
  string,
  { times180: number[]; checkouts: Array<{ score: number; t: number }> }
> {
  const byPlayer = new Map<string, { times180: number[]; checkouts: Array<{ score: number; t: number }> }>();

  const bump = (playerKey: string) => {
    if (!byPlayer.has(playerKey)) {
      byPlayer.set(playerKey, { times180: [], checkouts: [] });
    }
    return byPlayer.get(playerKey)!;
  };

  for (const match of matches || []) {
    const p1 = normalizeMongoId(match?.player1?.playerId);
    const p2 = normalizeMongoId(match?.player2?.playerId);
    for (const leg of match.legs || []) {
      const t = legTimeMs(leg);
      if (!Number.isFinite(t)) continue;

      if (p1) {
        for (const th of leg.player1Throws || []) {
          if (Number(th?.score) === 180) bump(p1).times180.push(t);
        }
      }
      if (p2) {
        for (const th of leg.player2Throws || []) {
          if (Number(th?.score) === 180) bump(p2).times180.push(t);
        }
      }

      const wid = normalizeMongoId(leg.winnerId);
      const cs = Number(leg.checkoutScore);
      if (wid && Number.isFinite(cs) && cs > 0) {
        bump(wid).checkouts.push({ score: cs, t });
      }
    }
  }

  for (const meta of byPlayer.values()) {
    meta.times180.sort((a, b) => a - b);
    meta.checkouts.sort((a, b) => a.t - b.t);
  }

  return byPlayer;
}

function tournamentPlayerRefId(player: any): string {
  return (
    normalizeMongoId(player?.playerReference?._id) ||
    normalizeMongoId(player?.playerReference) ||
    ""
  );
}

type RankingRowWork180 = PlayerRankingRow & { tieMs: number };
type RankingRowWorkCo = PlayerRankingRow & { tieMs: number };

export const getDefaultTvSettings = (): TvSettings => ({
  enabledSlides: {
    rankings: true,
    groups: true,
    boardStatus: true,
    knockoutLeft: true,
    knockoutRight: true,
    knockoutFinal: true,
  },
  baseIntervalMs: 10000,
  urgentIntervalMs: 7000,
  perSlideDurationMs: {},
  maxConsecutiveUrgent: 3,
  knockoutSplitThreshold: 4,
  highAlertInterrupts: true,
  boardUrgencyEnabled: true,
  milestoneUrgencyEnabled: true,
  freezeBaseRotation: false,
  showQr: true,
});

export const getRankings180 = (
  tournament: any,
  limit = 10,
  legMatches?: TvLegMatchLite[] | null,
): PlayerRankingRow[] => {
  const metaMap = buildTvPlayerLegMeta(legMatches ?? undefined);

  const rows: RankingRowWork180[] = (tournament?.tournamentPlayers || [])
    .map((player: any) => {
      const refId = tournamentPlayerRefId(player);
      const count = Number(player?.stats?.oneEightiesCount || 0);
      const meta = refId ? metaMap.get(refId) : undefined;
      const times180 = meta?.times180 ?? [];

      let timeLabel: string | undefined;
      let tieMs = Number.POSITIVE_INFINITY;

      if (count > 0 && times180.length > 0) {
        const lastT = times180[times180.length - 1];
        if (Number.isFinite(lastT)) {
          timeLabel = formatBracketedHm(lastT);
        }
        const idx = count - 1;
        if (idx >= 0 && idx < times180.length) {
          tieMs = times180[idx];
        }
      }

      return {
        playerId: asString(player?._id) || `${player?.playerReference?._id || player?.playerReference?.name || "player"}`,
        name: playerNameFromRef(player?.playerReference, "Unknown"),
        value: count,
        timeLabel,
        tieMs,
      };
    })
    .filter((row: RankingRowWork180) => row.value > 0);

  rows.sort((a: RankingRowWork180, b: RankingRowWork180) => {
    if (b.value !== a.value) return b.value - a.value;
    if (a.tieMs !== b.tieMs) return a.tieMs - b.tieMs;
    return a.name.localeCompare(b.name);
  });

  return rows.slice(0, limit).map(({ tieMs: _t, ...rest }) => rest);
};

export const getRankingsCheckout = (
  tournament: any,
  limit = 10,
  legMatches?: TvLegMatchLite[] | null,
): PlayerRankingRow[] => {
  const metaMap = buildTvPlayerLegMeta(legMatches ?? undefined);

  const rows: RankingRowWorkCo[] = (tournament?.tournamentPlayers || [])
    .map((player: any) => {
      const refId = tournamentPlayerRefId(player);
      const high = Number(player?.stats?.highestCheckout || 0);
      const meta = refId ? metaMap.get(refId) : undefined;
      const checkouts = meta?.checkouts ?? [];

      let timeLabel: string | undefined;
      let tieMs = Number.POSITIVE_INFINITY;

      if (high > 0 && checkouts.length > 0) {
        const atHigh = checkouts.filter((c) => c.score === high);
        if (atHigh.length > 0) {
          tieMs = atHigh[0].t;
          const lastT = atHigh[atHigh.length - 1].t;
          timeLabel = formatBracketedHm(lastT);
        }
      }

      return {
        playerId: asString(player?._id) || `${player?.playerReference?._id || player?.playerReference?.name || "player"}`,
        name: playerNameFromRef(player?.playerReference, "Unknown"),
        value: high,
        timeLabel,
        tieMs,
      };
    })
    .filter((row: RankingRowWorkCo) => row.value > 0);

  rows.sort((a: RankingRowWorkCo, b: RankingRowWorkCo) => {
    if (b.value !== a.value) return b.value - a.value;
    if (a.tieMs !== b.tieMs) return a.tieMs - b.tieMs;
    return a.name.localeCompare(b.name);
  });

  return rows.slice(0, limit).map(({ tieMs: _t, ...rest }) => rest);
};

export const getBoardSummary = (tournament: any): BoardSummary => {
  const boards = tournament?.boards || [];
  const waitingBoards = boards.filter((board: any) => board?.status === "waiting");
  const waitingRows = waitingBoards.map((board: any) => ({
    boardNumber: Number(board?.boardNumber || 0),
    player1Name: playerNameFromRef(board?.nextMatch?.player1),
    player2Name: playerNameFromRef(board?.nextMatch?.player2),
    scorerName: asString(board?.nextMatch?.scorer?.name),
  }));

  const playingCount = boards.filter((board: any) => board?.status === "playing").length;
  const idleCount = boards.filter((board: any) => board?.status === "idle").length;

  return {
    waitingBoards: waitingRows,
    waitingCount: waitingRows.length,
    playingCount,
    idleCount,
    totalCount: boards.length,
  };
};

export const getGroupsDisplay = (tournament: any): GroupDisplay[] => {
  const groups = tournament?.groups || [];
  const players = tournament?.tournamentPlayers || [];

  return groups.map((group: any, groupIndex: number) => {
    const rows = players
      .filter((player: any) => player?.groupId === group?._id)
      .sort((a: any, b: any) => Number(a?.groupStanding || 999) - Number(b?.groupStanding || 999))
      .map((player: any, index: number) => ({
        playerId: asString(player?._id) || `${group?._id}-${index}`,
        name: playerNameFromRef(player?.playerReference, "Unknown"),
        standing: Number(player?.groupStanding || index + 1),
        points: Number(player?.stats?.matchesWon || 0) * 2,
        legs: Number(player?.stats?.legsWon || 0),
      }));

    return {
      id: asString(group?._id) || `group-${groupIndex}`,
      label: `Group ${groupIndex + 1}`,
      boardNumber: Number(group?.board || groupIndex + 1),
      rows,
    };
  });
};

export const getKnockoutDisplay = (tournament: any, splitThreshold: number): KnockoutDisplay => {
  const rounds = tournament?.knockout || [];
  const roundDisplays: KnockoutRoundDisplay[] = rounds.map((round: any, index: number) => {
    const matches = (round?.matches || []).map((entry: any, matchIndex: number) => {
      const match = entry?.matchReference || entry;
      return {
        id: asString(match?._id) || `${index}-${matchIndex}`,
        boardLabel: match?.boardReference ? `Board ${match.boardReference}` : `#${match?.matchNumber || matchIndex + 1}`,
        status: asString(match?.status) || "pending",
        player1Name: playerNameFromRef(match?.player1?.playerId || entry?.player1),
        player2Name: playerNameFromRef(match?.player2?.playerId || entry?.player2),
        player1Legs: Number(match?.player1?.legsWon || 0),
        player2Legs: Number(match?.player2?.legsWon || 0),
        scorerName: asString(match?.scorer?.name),
      } as KnockoutMatchDisplay;
    });

    return {
      id: asString(round?._id) || `round-${index}`,
      label: toRoundLabel(index, rounds.length),
      matches,
    };
  });

  const shouldSplit = roundDisplays.some((round: KnockoutRoundDisplay) => round.matches.length > splitThreshold);
  const leftRounds = roundDisplays
    .map((round: KnockoutRoundDisplay) => ({
      ...round,
      matches: round.matches.length > 1 ? round.matches.slice(0, Math.ceil(round.matches.length / 2)) : [],
    }))
    .filter((round: KnockoutRoundDisplay) => round.matches.length > 0);
  const rightRounds = roundDisplays
    .map((round: KnockoutRoundDisplay) => ({
      ...round,
      matches: round.matches.length > 1 ? round.matches.slice(Math.ceil(round.matches.length / 2)) : [],
    }))
    .filter((round: KnockoutRoundDisplay) => round.matches.length > 0);
  const finalRound = roundDisplays[roundDisplays.length - 1];

  return {
    shouldSplit,
    leftRounds,
    rightRounds,
    allRounds: roundDisplays,
    finalMatch: finalRound?.matches?.[0],
  };
};

export const getMilestoneSnapshot = (tournament: any): MilestoneSnapshot => {
  const players = tournament?.tournamentPlayers || [];
  let topCheckout = 0;
  let topCheckoutPlayer = "";
  let total180 = 0;
  let leader180 = "";
  let leader180Count = 0;

  for (const player of players) {
    const checkout = Number(player?.stats?.highestCheckout || 0);
    const oneEighties = Number(player?.stats?.oneEightiesCount || 0);
    const name = playerNameFromRef(player?.playerReference, "Unknown");

    if (checkout > topCheckout) {
      topCheckout = checkout;
      topCheckoutPlayer = name;
    }

    total180 += oneEighties;
    if (oneEighties > leader180Count) {
      leader180Count = oneEighties;
      leader180 = name;
    }
  }

  return {
    topCheckout,
    topCheckoutPlayer,
    total180,
    leader180,
  };
};

export const buildBaseSlides = (tournament: any, settings: TvSettings): SlideDefinition[] => {
  const slides: SlideDefinition[] = [];
  const tournamentStatus = tournament?.tournamentSettings?.status || tournament?.status;
  const isKnockout = tournamentStatus === "knockout" || tournamentStatus === "finished";
  const knockout = getKnockoutDisplay(tournament, settings.knockoutSplitThreshold);
  const boardSummary = getBoardSummary(tournament);
  const isFinalLive = isKnockout && knockout.finalMatch?.status === "ongoing";

  // During a live final, keep TV focus on the final score only.
  if (isFinalLive) {
    return [
      {
        id: "base-knockout-final-live-focus",
        type: "knockoutFinal",
        kind: "base",
        durationMs: settings.perSlideDurationMs.knockoutFinal,
      },
    ];
  }

  if (settings.enabledSlides.rankings) {
    slides.push({
      id: "base-rankings",
      type: "rankings",
      kind: "base",
      durationMs: settings.perSlideDurationMs.rankings,
    });
  }

  if (isKnockout && knockout.allRounds.length > 0) {
    const split = knockout.shouldSplit;
    if (settings.enabledSlides.knockoutLeft) {
      slides.push({
        id: split ? "base-knockout-left" : "base-knockout-full",
        type: "knockoutLeft",
        kind: "base",
        payload: { mode: split ? "left" : "full" },
        durationMs: settings.perSlideDurationMs.knockoutLeft,
      });
    }

    if (split && settings.enabledSlides.knockoutRight) {
      slides.push({
        id: "base-knockout-right",
        type: "knockoutRight",
        kind: "base",
        payload: { mode: "right" },
        durationMs: settings.perSlideDurationMs.knockoutRight,
      });
    }

    if (split && (settings.enabledSlides.knockoutLeft || settings.enabledSlides.knockoutRight)) {
      slides.push({
        id: "base-knockout-full-after-split",
        type: "knockoutLeft",
        kind: "base",
        payload: { mode: "full" },
        durationMs: settings.perSlideDurationMs.knockoutLeft,
      });
    }

    if (settings.enabledSlides.knockoutFinal && knockout.finalMatch) {
      slides.push({
        id: "base-knockout-final",
        type: "knockoutFinal",
        kind: "base",
        durationMs: settings.perSlideDurationMs.knockoutFinal,
      });
    }
  } else if (settings.enabledSlides.groups) {
    slides.push({
      id: "base-groups",
      type: "groups",
      kind: "base",
      durationMs: settings.perSlideDurationMs.groups,
    });
  }

  if (settings.enabledSlides.boardStatus && boardSummary.waitingCount > 0) {
    slides.push({
      id: "base-board-status",
      type: "boardStatus",
      kind: "base",
      durationMs: settings.perSlideDurationMs.boardStatus,
    });
  }

  return slides;
};

export const buildUrgentEvents = (
  prevTournament: any | null,
  nextTournament: any,
  settings: TvSettings
): UrgentEvent[] => {
  if (!prevTournament) return [];

  const nextKnockout = getKnockoutDisplay(nextTournament, settings.knockoutSplitThreshold);
  const nextStatus = nextTournament?.tournamentSettings?.status || nextTournament?.status;
  const isKnockout = nextStatus === "knockout" || nextStatus === "finished";
  if (isKnockout && nextKnockout.finalMatch?.status === "ongoing") {
    return [];
  }

  const urgent: UrgentEvent[] = [];

  if (settings.boardUrgencyEnabled) {
    const boardSummary = getBoardSummary(nextTournament);
    const boardNeedsAttention = boardSummary.waitingCount > 0 && boardSummary.playingCount < boardSummary.totalCount;

    if (boardNeedsAttention) {
      urgent.push({
        id: `board-urgent-${now()}`,
        type: "boardUrgent",
        createdAt: now(),
        cooldownKey: "board-urgent",
        payload: {
          waitingCount: boardSummary.waitingCount,
          playingCount: boardSummary.playingCount,
          totalCount: boardSummary.totalCount,
        },
      });
    }
  }

  if (settings.milestoneUrgencyEnabled) {
    const prevSnap = getMilestoneSnapshot(prevTournament);
    const nextSnap = getMilestoneSnapshot(nextTournament);

    if (nextSnap.topCheckout > prevSnap.topCheckout) {
      urgent.push({
        id: `milestone-checkout-${nextSnap.topCheckout}-${now()}`,
        type: "milestoneFlash",
        createdAt: now(),
        cooldownKey: `milestone-checkout-${nextSnap.topCheckout}`,
        payload: {
          milestoneType: "checkout",
          value: nextSnap.topCheckout,
          playerName: nextSnap.topCheckoutPlayer || "Unknown",
        },
      });
    }

    if (nextSnap.total180 > prevSnap.total180) {
      urgent.push({
        id: `milestone-180-${nextSnap.total180}-${now()}`,
        type: "milestoneFlash",
        createdAt: now(),
        cooldownKey: `milestone-180-${nextSnap.total180}`,
        payload: {
          milestoneType: "180",
          value: nextSnap.total180 - prevSnap.total180,
          playerName: nextSnap.leader180 || "Unknown",
          total180: nextSnap.total180,
        },
      });
    }
  }

  return urgent;
};

export const urgentEventToSlide = (event: UrgentEvent, settings: TvSettings): SlideDefinition => ({
  id: `urgent-${event.id}`,
  kind: "urgent",
  type: event.type,
  durationMs: event.durationMs ?? settings.urgentIntervalMs,
  payload: event.payload,
});
