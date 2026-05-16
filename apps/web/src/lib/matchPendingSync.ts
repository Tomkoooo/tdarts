import { finishMatchLegAction } from '@/features/matches/actions/matchGameplay.action';
import { finishBoardMatchAction } from '@/features/board/actions/boardPage.action';

export type PendingLegEndReason = 'checkout' | 'max-darts';

export type PendingLegPayload = {
  legNumber: number;
  winner: 1 | 2;
  player1Throws: number[];
  player2Throws: number[];
  winnerArrowCount?: number;
  endReason?: PendingLegEndReason;
};

export type PendingMatchSyncState = {
  pendingLegs: PendingLegPayload[];
  pendingMatchFinish?: {
    player1LegsWon: number;
    player2LegsWon: number;
    tournamentId: string;
    password?: string;
  };
};

const storageKey = (matchId: string) => `match_pending_sync_${matchId}`;

export function getPendingMatchSync(matchId: string): PendingMatchSyncState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    if (!raw) return null;
    return JSON.parse(raw) as PendingMatchSyncState;
  } catch {
    return null;
  }
}

export function setPendingMatchSync(matchId: string, state: PendingMatchSyncState): void {
  if (typeof window === 'undefined') return;
  if (state.pendingLegs.length === 0 && !state.pendingMatchFinish) {
    localStorage.removeItem(storageKey(matchId));
    return;
  }
  localStorage.setItem(storageKey(matchId), JSON.stringify(state));
}

export function appendPendingLeg(matchId: string, leg: PendingLegPayload): void {
  const current = getPendingMatchSync(matchId) ?? { pendingLegs: [] };
  const withoutDup = current.pendingLegs.filter((l) => l.legNumber !== leg.legNumber);
  setPendingMatchSync(matchId, {
    ...current,
    pendingLegs: [...withoutDup, leg],
  });
}

export function removePendingLeg(matchId: string, legNumber: number): void {
  const current = getPendingMatchSync(matchId);
  if (!current) return;
  setPendingMatchSync(matchId, {
    ...current,
    pendingLegs: current.pendingLegs.filter((l) => l.legNumber !== legNumber),
  });
}

export function setPendingMatchFinish(
  matchId: string,
  finish: PendingMatchSyncState['pendingMatchFinish']
): void {
  const current = getPendingMatchSync(matchId) ?? { pendingLegs: [] };
  setPendingMatchSync(matchId, { ...current, pendingMatchFinish: finish });
}

export function clearPendingMatchSync(matchId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(matchId));
}

export type FlushPendingResult = {
  legsFlushed: number;
  matchFinished: boolean;
  partialFailure: boolean;
};

export async function flushPendingMatchSync(matchId: string): Promise<FlushPendingResult> {
  const state = getPendingMatchSync(matchId);
  if (!state) {
    return { legsFlushed: 0, matchFinished: false, partialFailure: false };
  }

  const sortedLegs = [...state.pendingLegs].sort((a, b) => a.legNumber - b.legNumber);
  let legsFlushed = 0;
  let partialFailure = false;

  for (const leg of sortedLegs) {
    try {
      const response = await finishMatchLegAction({
        matchId,
        winner: leg.winner,
        player1Throws: leg.player1Throws,
        player2Throws: leg.player2Throws,
        winnerArrowCount: leg.winnerArrowCount,
        legNumber: leg.legNumber,
      });
      if ((response as { success?: boolean })?.success) {
        removePendingLeg(matchId, leg.legNumber);
        legsFlushed += 1;
      } else {
        partialFailure = true;
        break;
      }
    } catch {
      partialFailure = true;
      break;
    }
  }

  const afterLegs = getPendingMatchSync(matchId);
  let matchFinished = false;

  if (!partialFailure && afterLegs?.pendingMatchFinish) {
    const f = afterLegs.pendingMatchFinish;
    try {
      const response = await finishBoardMatchAction({
        tournamentId: f.tournamentId,
        matchId,
        player1LegsWon: f.player1LegsWon,
        player2LegsWon: f.player2LegsWon,
        password: f.password,
      });
      if ((response as { success?: boolean })?.success) {
        clearPendingMatchSync(matchId);
        matchFinished = true;
      } else {
        partialFailure = true;
      }
    } catch {
      partialFailure = true;
    }
  } else if (!partialFailure && !afterLegs?.pendingLegs.length && !afterLegs?.pendingMatchFinish) {
    clearPendingMatchSync(matchId);
  }

  return { legsFlushed, matchFinished, partialFailure };
}
