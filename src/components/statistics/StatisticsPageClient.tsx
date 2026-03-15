"use client";

import React from "react";
import { useUserContext } from "@/hooks/useUser";
import { usePlayerStatistics } from "@/features/statistics/hooks/usePlayerStatistics";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IconChartBar, IconTargetArrow, IconTrophy } from "@tabler/icons-react";

const fallbackSeries = [
  { month: "Jan", average: 46, wins: 4 },
  { month: "Feb", average: 49, wins: 5 },
  { month: "Mar", average: 52, wins: 6 },
  { month: "Apr", average: 55, wins: 7 },
  { month: "May", average: 54, wins: 6 },
  { month: "Jun", average: 58, wins: 8 },
];

export function StatisticsPageClient() {
  const { user } = useUserContext();
  const { summary, series, loading } = usePlayerStatistics(user?._id);
  const chartSeries = series.length > 0 ? series : fallbackSeries;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Clear insights for every throw.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GlassmorphismCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Matches</p>
              <IconTrophy className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              <AnimatedCounter value={summary.matches} />
            </p>
          </GlassmorphismCard>
          <GlassmorphismCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Win rate</p>
              <IconChartBar className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              <AnimatedCounter value={summary.winRate} suffix="%" />
            </p>
          </GlassmorphismCard>
          <GlassmorphismCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Average</p>
              <IconTargetArrow className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              <AnimatedCounter value={summary.average} />
            </p>
          </GlassmorphismCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassmorphismCard className="p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Average Trend</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="averageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="average"
                    stroke="hsl(var(--primary))"
                    fill="url(#averageGradient)"
                    strokeWidth={2}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassmorphismCard>

          <GlassmorphismCard className="p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Monthly Wins</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                  />
                  <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassmorphismCard>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Refreshing data...</p> : null}
      </div>
    </div>
  );
}
