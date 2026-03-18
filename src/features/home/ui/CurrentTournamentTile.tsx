"use client"

import Link from "next/link"
import { IconCalendarEvent, IconCoins, IconLayoutDashboard, IconTargetArrow, IconUsers } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/Button"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeTournament } from "@/features/home/ui/types"
import { formatTournamentDate } from "@/features/home/ui/homeUtils"

interface CurrentTournamentTileProps {
  tournament: HomeTournament | null
  loading?: boolean
}

export default function CurrentTournamentTile({ tournament, loading = false }: CurrentTournamentTileProps) {
  const t = useTranslations("HomeDashboard")
  const locale = useLocale()

  if (loading) {
    return (
      <GlassmorphismCard className="p-5">
        <Skeleton className="h-6 w-52 rounded-md bg-muted/70" />
        <Skeleton className="mt-3 h-6 w-40 rounded-md bg-muted/70" />
        <Skeleton className="mt-2 h-4 w-48 rounded-md bg-muted/70" />
        <Skeleton className="mt-2 h-4 w-56 rounded-md bg-muted/70" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Skeleton className="h-14 w-full rounded-lg bg-muted/70" />
          <Skeleton className="h-14 w-full rounded-lg bg-muted/70" />
        </div>
      </GlassmorphismCard>
    )
  }

  if (!tournament) {
    return (
      <GlassmorphismCard className="p-5">
        <h2 className="text-base font-semibold md:text-lg">{t("currentTournament.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("currentTournament.empty")}</p>
        <Button asChild className="mt-4">
          <Link href="/search?tab=tournaments">{t("joinTournament")}</Link>
        </Button>
      </GlassmorphismCard>
    )
  }

  const status = (tournament.status || "pending").toLowerCase()
  const boardStatus =
    status.includes("active") || status.includes("live") || status.includes("ongoing")
      ? t("currentTournament.boardStatusActive")
      : t("currentTournament.boardStatusUpcoming")

  return (
    <GlassmorphismCard className="p-5">
      <h2 className="text-base font-semibold md:text-lg">{t("currentTournament.title")}</h2>
      <Link
        href={`/tournaments/${tournament.code}`}
        className="mt-3 block rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:bg-muted/40"
      >
        <p className="text-lg font-semibold">{tournament.name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <IconCalendarEvent className="h-3.5 w-3.5" />
          {formatTournamentDate(tournament.date, locale)}
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <IconLayoutDashboard className="h-3.5 w-3.5" />
          {boardStatus}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/50 bg-card/60 p-2">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <IconUsers className="h-3.5 w-3.5" />
              {t("currentTournament.players")}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {tournament.currentPlayers || 0}/{tournament.maxPlayers || 0}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/60 p-2">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <IconCoins className="h-3.5 w-3.5" />
              {t("currentTournament.entryFee")}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {Number(tournament.entryFee || 0).toLocaleString(locale)} Ft
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm">
          <Link href={`/tournaments/${tournament.code}`}>
            <IconTargetArrow className="mr-1 h-4 w-4" />
            {t("currentTournament.openOverview")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/board">{t("currentTournament.openBoard")}</Link>
        </Button>
      </div>
    </GlassmorphismCard>
  )
}
