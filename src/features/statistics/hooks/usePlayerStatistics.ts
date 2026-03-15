"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  selectPlayerStatsSummary,
  selectMonthlySeries,
} from "../lib/selectors";
import type {
  PlayerStatsSummaryDto,
  MonthlyPerformanceDto,
} from "../types/statistics.dto";

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
      const response = await axios.get(`/api/players/stats/${playerId}`);
      const data = response?.data ?? {};
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
