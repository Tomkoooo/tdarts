"use client"

import Link from "next/link"
import { IconArrowRight, IconChartBar, IconPodium, IconTrophy } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeLeagueStanding } from "@/features/home/ui/types"

interface LeagueStandingsTileProps {
  standings: HomeLeagueStanding[]
  loading: boolean
}

export default function LeagueStandingsTile({ standings, loading }: LeagueStandingsTileProps) {
  const t = useTranslations("HomeDashboard")

  return (
    <GlassmorphismCard className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <IconChartBar className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold md:text-lg">{t("league.title")}</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl bg-muted/70" />
          <Skeleton className="h-14 w-full rounded-xl bg-muted/70" />
        </div>
      ) : standings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("league.empty")}</p>
      ) : (
        <div className="space-y-2">
          {standings.slice(0, 3).map((item) => (
            <Link
              key={item.leagueId}
              href={`/myclub`}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.leagueName}</p>
                <p className="truncate text-xs text-muted-foreground">{item.clubName}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs font-semibold text-primary">
                  <IconPodium className="h-3.5 w-3.5" />#{item.position}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <IconTrophy className="mr-1 inline h-3.5 w-3.5" />
                  {item.totalPoints} {t("league.points")}
                </p>
              </div>
            </Link>
          ))}
          <Link href="/myclub" className="mt-1 inline-flex items-center text-xs text-primary hover:underline">
            {t("league.open")}
            <IconArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </GlassmorphismCard>
  )
}
