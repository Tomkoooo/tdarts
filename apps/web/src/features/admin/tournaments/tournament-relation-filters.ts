export type TournamentRelationFilters = {
  playerStatus: string;
  playerQ: string;
  matchStatus: string;
  matchType: string;
  matchRound: string;
  matchBoard: string;
};

export function parseTournamentRelationFilters(
  sp: Record<string, string | string[] | undefined>,
): TournamentRelationFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  return {
    playerStatus: first(sp.relPlayerStatus) || 'all',
    playerQ: first(sp.relPlayerQ).trim(),
    matchStatus: first(sp.relMatchStatus) || 'all',
    matchType: first(sp.relMatchType) || 'all',
    matchRound: first(sp.relMatchRound),
    matchBoard: first(sp.relMatchBoard),
  };
}

export function tournamentRelationFilterQuery(
  f: TournamentRelationFilters,
): Record<string, string | undefined> {
  return {
    relPlayerStatus: f.playerStatus !== 'all' ? f.playerStatus : undefined,
    relPlayerQ: f.playerQ || undefined,
    relMatchStatus: f.matchStatus !== 'all' ? f.matchStatus : undefined,
    relMatchType: f.matchType !== 'all' ? f.matchType : undefined,
    relMatchRound: f.matchRound || undefined,
    relMatchBoard: f.matchBoard || undefined,
  };
}
