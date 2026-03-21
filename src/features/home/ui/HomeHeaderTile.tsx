"use client"

import { Link } from "@/i18n/routing"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarEvent,
  IconCoins,
  IconSwords,
  IconUsers,
} from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/Button"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeTournament } from "@/features/home/ui/types"
import { formatTournamentDate, getDaysUntil } from "@/features/home/ui/homeUtils"

interface HomeHeaderTileProps {
  firstName: string
  profilePicture?: string
  activeOrNextTournament: HomeTournament | null
  notificationCount?: number
  onNotificationWarningClick?: () => void
  loading?: boolean
}

export default function HomeHeaderTile({
  firstName,
  profilePicture,
  activeOrNextTournament,
  notificationCount = 0,
  onNotificationWarningClick,
  loading = false,
}: HomeHeaderTileProps) {
  const t = useTranslations("HomeDashboard")
  const locale = useLocale()
  const daysUntil = getDaysUntil(activeOrNextTournament?.date)
  const hasTournament = Boolean(activeOrNextTournament?._id)
  const status = (activeOrNextTournament?.status || "").toLowerCase()
  const isActive =
    status.includes("active") ||
    status.includes("live") ||
    status.includes("ongoing") ||
    status.includes("in_progress") ||
    status.includes("group-stage") ||
    status.includes("knockout")
  const isStarted =
    isActive || status.includes("group-stage") || status.includes("knockout")

  const getNextMatchLabel = () => {
    const boardLabel = activeOrNextTournament?.nextMatchBoard
      ? t("header.boardNumber", { number: activeOrNextTournament.nextMatchBoard })
      : t("header.boardTbd")

    const mt = activeOrNextTournament?.nextMatchType
    if (mt === "playing") {
      return t("header.nextPlaying", { board: boardLabel })
    }
    if (mt === "scoring") {
      return t("header.nextScoring", { board: boardLabel })
    }
    if (mt === "pendingPlaying") {
      return t("header.nextPendingPlaying", { board: boardLabel })
    }
    if (mt === "pendingScoring") {
      return t("header.nextPendingScoring", { board: boardLabel })
    }
    if (mt === "pendingUnknown") {
      return t("header.nextPendingUnknown", { board: boardLabel })
    }
    if (mt === "pending") {
      return t("header.nextPending", { board: boardLabel })
    }
    return t("header.nextUnknown")
  }

  return (
    <GlassmorphismCard className="relative overflow-hidden p-5 md:p-7" intensity="strong">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 8% 18%, color-mix(in srgb, var(--color-primary) 40%, transparent) 0%, transparent 52%), radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--color-accent) 30%, transparent) 0%, transparent 48%)",
        }}
      />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="group">
            <Avatar className="h-12 w-12 border border-primary/60 md:h-14 md:w-14">
              <AvatarImage src={profilePicture} alt={firstName} />
              <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary-foreground">
                {firstName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("welcome")}</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{t("headline", { name: firstName })}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/50 p-3 backdrop-blur-xl md:min-w-[290px]">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("header.title")}</p>
          {loading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-40 rounded-md bg-muted/70" />
              <Skeleton className="h-3 w-48 rounded-md bg-muted/70" />
            </div>
          ) : hasTournament ? (
            <Link
              href={`/tournaments/${activeOrNextTournament?.code}`}
              className="mt-1 block rounded-xl border border-border/60 bg-card/50 p-2.5 transition-colors hover:bg-muted/40"
            >
              <p className="truncate text-sm font-semibold">{activeOrNextTournament?.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <IconCalendarEvent className="h-3.5 w-3.5" />
                {formatTournamentDate(activeOrNextTournament?.date, locale)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <IconUsers className="h-3 w-3" />
                    {t("header.players")}
                  </p>
                  <p className="text-xs font-semibold">
                    {activeOrNextTournament?.currentPlayers || 0}/{activeOrNextTournament?.maxPlayers || 0}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <IconCoins className="h-3 w-3" />
                    {t("header.entryFee")}
                  </p>
                  <p className="text-xs font-semibold">
                    {Number(activeOrNextTournament?.entryFee || 0).toLocaleString(locale)} Ft
                  </p>
                </div>
              </div>
              {isStarted && (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5">
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <IconSwords className="h-3 w-3" />
                      {t("header.performance")}
                    </p>
                    <p className="text-xs font-semibold">
                      {t("header.matchRecord", {
                        wins: activeOrNextTournament?.wins || 0,
                        losses: activeOrNextTournament?.losses || 0,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("header.legRecord", {
                        won: activeOrNextTournament?.legsWon || 0,
                        lost: activeOrNextTournament?.legsLost || 0,
                      })}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-accent">{getNextMatchLabel()}</p>
                  {(activeOrNextTournament?.nextMatchType === "playing" ||
                    activeOrNextTournament?.nextMatchType === "pendingPlaying") &&
                  activeOrNextTournament?.nextMatchOpponentName ? (
                    <p className="rounded-md border border-amber-500/45 bg-amber-500/15 px-2 py-1.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
                      <IconAlertTriangle className="mb-0.5 mr-1 inline h-3.5 w-3.5" aria-hidden />
                      {t("header.nextMatchVsWarning", {
                        opponent: activeOrNextTournament.nextMatchOpponentName,
                      })}
                    </p>
                  ) : null}
                  {activeOrNextTournament?.nextMatchType === "scoring" ||
                  activeOrNextTournament?.nextMatchType === "pendingScoring" ? (
                    <p className="rounded-md border border-amber-500/45 bg-amber-500/15 px-2 py-1.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
                      <IconAlertTriangle className="mb-0.5 mr-1 inline h-3.5 w-3.5" aria-hidden />
                      {t("header.nextScoringReminder")}
                    </p>
                  ) : null}
                </div>
              )}
              {isActive ? (
                <p className="mt-2 inline-flex items-center text-xs font-medium text-primary">
                  {t("header.openActiveTournament")}
                  <IconArrowRight className="ml-1 h-3.5 w-3.5" />
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {daysUntil !== null && daysUntil >= 0 ? t("header.daysUntil", { count: daysUntil }) : t("header.noDate")}
                </p>
              )}
            </Link>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t("header.noTournament")}</p>
          )}
        </div>
      </div>

      {!loading && notificationCount > 0 && (
        <button
          type="button"
          onClick={onNotificationWarningClick}
          className="relative mt-3 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/20 px-3 py-2 text-xs font-semibold text-warning-foreground"
        >
          <IconAlertTriangle className="h-4 w-4" />
          {t("header.notificationsWarning", { count: notificationCount })}
        </button>
      )}

      <div className="relative mt-4 flex flex-wrap gap-2">
        <Button asChild className="md:hidden" variant="outline" size="sm">
          <Link href="/landing">{t("header.landingPage")}</Link>
        </Button>
        <Button asChild>
          <Link href="/search?tab=tournaments">{t("joinTournament")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/profile?tab=stats">{t("viewStats")}</Link>
        </Button>
      </div>
    </GlassmorphismCard>
  )
}
