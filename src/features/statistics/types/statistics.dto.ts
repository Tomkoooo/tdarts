export interface PlayerStatsSummaryDto {
  matches: number;
  winRate: number;
  average: number;
}

export interface MonthlyPerformanceDto {
  month: string;
  average: number;
  wins: number;
}

export interface PlayerStatsApiResponse {
  matchesPlayed?: number;
  totalMatches?: number;
  winRate?: number;
  overallAverage?: number;
  average?: number;
  monthlyPerformance?: Array<{
    month?: string;
    average?: number;
    wins?: number;
  }>;
}
