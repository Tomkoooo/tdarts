"use client"

import { IconCalendarEvent, IconChartBar, IconHash, IconTrophy } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeMetrics } from "@/features/home/ui/types"

interface QuickStatsTileGridProps {
  metrics: HomeMetrics
  loading: boolean
  advancedStatsEnabled: boolean
}

export default function QuickStatsTileGrid({ metrics, loading, advancedStatsEnabled }: QuickStatsTileGridProps) {
  const t = useTranslations("HomeDashboard")

  const statTiles = [
    {
      key: "matches",
      label: t("stats.matches"),
      value: metrics.matchesPlayed,
      icon: IconTrophy,
      suffix: "",
    },
    {
      key: "winRate",
      label: t("stats.winRate"),
      value: metrics.winRate,
      icon: IconChartBar,
      suffix: "%",
    },
    {
      key: "tournaments",
      label: t("stats.tournaments"),
      value: metrics.tournamentsJoined,
      icon: IconCalendarEvent,
      suffix: "",
    },
    {
      key: "ranking",
      label: t("stats.ranking"),
      value: advancedStatsEnabled && metrics.currentRanking ? metrics.currentRanking : 0,
      icon: IconHash,
      suffix: "",
      prefix: advancedStatsEnabled && metrics.currentRanking ? "#" : "",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statTiles.map((tile) => {
        const Icon = tile.icon
        return (
          <GlassmorphismCard key={tile.key} className="p-4 md:p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{tile.label}</p>
              <Icon className="h-4 w-4 text-primary/80" />
            </div>
            <div className="mt-3 text-2xl font-bold md:text-3xl">
              {loading ? (
                <Skeleton className="h-9 w-24 rounded-md bg-muted/70" />
              ) : (
                <AnimatedCounter value={tile.value} suffix={tile.suffix} prefix={tile.prefix} />
              )}
            </div>
          </GlassmorphismCard>
        )
      })}
    </div>
  )
}
