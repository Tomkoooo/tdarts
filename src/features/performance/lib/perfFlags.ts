export function isPerfFlagEnabled(flagName: string): boolean {
  return process.env[flagName] === "true";
}

export const perfFlags = {
  tournamentReadModelV2: isPerfFlagEnabled("FF_TOURNAMENT_READ_MODEL_V2"),
  realtimeLiteFirst: isPerfFlagEnabled("FF_REALTIME_LITE_FIRST"),
  realtimeRequireScopedSse: isPerfFlagEnabled("FF_REALTIME_REQUIRE_SCOPED_SSE"),
  searchFanoutV2: isPerfFlagEnabled("FF_SEARCH_FANOUT_V2"),
  seasonAveragesBulk: isPerfFlagEnabled("FF_SEASON_AVERAGES_BULK"),
};
