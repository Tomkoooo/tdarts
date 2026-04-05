/**
 * Embedded `tournamentPlayers.stats` during live group play = group-stage W/L (via `updateGroupStanding`).
 * After `finishTournament`, `stats` / `finalStats` = full tournament (group + knockout); `groupStats` = group-stage snapshot.
 * Use this helper anywhere the UI shows group tables or “group points” so finished events stay correct.
 */
export type GroupTableStats = {
    matchesWon: number;
    matchesLost: number;
    legsWon: number;
    legsLost: number;
    avg: number;
    firstNineAvg: number;
    oneEightiesCount: number;
    highestCheckout: number;
};

export function getGroupTableStats(
    player: { stats?: Partial<GroupTableStats> | null; groupStats?: Partial<GroupTableStats> | null },
    tournamentStatus: string | undefined
): GroupTableStats {
    const finished = tournamentStatus === 'finished';
    const groupSnapshot = player.groupStats;
    const useGroupSnapshot =
        finished &&
        groupSnapshot != null &&
        typeof groupSnapshot === 'object' &&
        typeof (groupSnapshot as GroupTableStats).matchesWon === 'number';

    const src = useGroupSnapshot ? groupSnapshot : player.stats;
    const s = src || {};
    const avgRaw = s.avg ?? (s as { average?: number }).average;
    return {
        matchesWon: Number(s.matchesWon ?? 0),
        matchesLost: Number(s.matchesLost ?? 0),
        legsWon: Number(s.legsWon ?? 0),
        legsLost: Number(s.legsLost ?? 0),
        avg: Number(avgRaw ?? 0),
        firstNineAvg: Number(s.firstNineAvg ?? 0),
        oneEightiesCount: Number(s.oneEightiesCount ?? 0),
        highestCheckout: Number(s.highestCheckout ?? 0),
    };
}
