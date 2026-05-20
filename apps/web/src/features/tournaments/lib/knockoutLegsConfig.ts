import type { Tournament } from '@/interface/tournament.interface';

type KnockoutRound = NonNullable<Tournament['knockout']>[number];
type KnockoutMatch = KnockoutRound['matches'][number];

function matchHasAssignedPlayers(match: KnockoutMatch): boolean {
  const p1 = match?.player1;
  const p2 = match?.player2;
  const hasP1 = Boolean(p1 && (typeof p1 === 'object' ? p1.name || p1._id : p1));
  const hasP2 = Boolean(p2 && (typeof p2 === 'object' ? p2.name || p2._id : p2));
  return hasP1 || hasP2;
}

/** One entry per round number; prefers the round object with more matches. */
export function dedupeKnockoutRounds(
  rounds: KnockoutRound[] | undefined
): KnockoutRound[] {
  const byRound = new Map<number, KnockoutRound>();
  for (const round of rounds ?? []) {
    const existing = byRound.get(round.round);
    if (!existing) {
      byRound.set(round.round, round);
      continue;
    }
    const existingCount = existing.matches?.length ?? 0;
    const nextCount = round.matches?.length ?? 0;
    if (nextCount > existingCount) {
      byRound.set(round.round, round);
    }
  }
  return [...byRound.values()].sort((a, b) => a.round - b.round);
}

/**
 * Knockout rounds shown in legs-to-win config: deduped, with at least one match slot,
 * and either has players assigned or is at/before the active knockout round.
 */
export function getConfigurableKnockoutRounds(tournament: Tournament): KnockoutRound[] {
  const deduped = dedupeKnockoutRounds(tournament.knockout);
  if (deduped.length === 0) return [];

  let activeRound = 1;
  for (const round of deduped) {
    if ((round.matches ?? []).some((m) => matchHasAssignedPlayers(m))) {
      activeRound = Math.max(activeRound, round.round);
    }
  }

  return deduped.filter((round) => {
    if ((round.matches?.length ?? 0) === 0) return false;
    const hasPlayers = (round.matches ?? []).some((m) => matchHasAssignedPlayers(m));
    if (hasPlayers) return true;
    return round.round <= activeRound;
  });
}
