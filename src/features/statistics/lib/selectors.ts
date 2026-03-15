import type {
  PlayerStatsSummaryDto,
  MonthlyPerformanceDto,
  PlayerStatsApiResponse,
} from "../types/statistics.dto";

export function selectPlayerStatsSummary(
  data: PlayerStatsApiResponse | null | undefined
): PlayerStatsSummaryDto {
  if (!data) {
    return { matches: 0, winRate: 0, average: 0 };
  }
  return {
    matches: Number(data.matchesPlayed ?? data.totalMatches ?? 0),
    winRate: Number(data.winRate ?? 0),
    average: Number(data.overallAverage ?? data.average ?? 0),
  };
}

export function selectMonthlySeries(
  data: PlayerStatsApiResponse | null | undefined
): MonthlyPerformanceDto[] {
  const raw = data?.monthlyPerformance;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  return raw.map((item) => ({
    month: String(item.month ?? "N/A"),
    average: Number(item.average ?? 0),
    wins: Number(item.wins ?? 0),
  }));
}
