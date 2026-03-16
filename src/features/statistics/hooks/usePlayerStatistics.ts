"use client";

import { useCallback, useEffect, useState } from "react";
import {
  selectPlayerStatsSummary,
  selectMonthlySeries,
} from "../lib/selectors";
import type {
  PlayerStatsSummaryDto,
  MonthlyPerformanceDto,
} from "../types/statistics.dto";
import { getPlayerStatisticsAction } from "../actions/getPlayerStatistics.action";

export function usePlayerStatistics(playerId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PlayerStatsSummaryDto>({
    matches: 0,
    winRate: 0,
    average: 0,
  });
  const [series, setSeries] = useState<MonthlyPerformanceDto[]>([]);

  const fetchStats = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const data = await getPlayerStatisticsAction({ playerId });
      setSummary(selectPlayerStatsSummary(data));
      setSeries(selectMonthlySeries(data));
    } catch (error) {
      console.error("Statistics fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { summary, series, loading, refetch: fetchStats };
}
