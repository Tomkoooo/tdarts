"use client"

import Link from "next/link"
import { IconCalendarEvent, IconCoin, IconDownload, IconExternalLink, IconUsers } from "@tabler/icons-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/Button"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeTournament } from "@/features/home/ui/types"
import { formatTournamentDate, getUpcomingTournaments, parseTournamentDate } from "@/features/home/ui/homeUtils"
import { TournamentFormatBadges } from "@/components/tournament/TournamentFormatBadges"

interface UpcomingCalendarTileProps {
  tournaments: HomeTournament[]
  loading: boolean
}

function toIcsDate(date: Date): string {
  const utc = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return utc.toISOString().replace(/[-:]/g, "").replace(".000", "")
}

function buildIcsFile(tournaments: HomeTournament[]): string {
  const now = new Date()
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tdarts//home-dashboard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  tournaments.forEach((tor) => {
    const startDate = parseTournamentDate(tor.date)
    if (!startDate) return
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
    const uid = `${tor._id}@tdarts`
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${toIcsDate(now)}`)
    lines.push(`DTSTART:${toIcsDate(startDate)}`)
    lines.push(`DTEND:${toIcsDate(endDate)}`)
    lines.push(`SUMMARY:${tor.name.replace(/,/g, "\\,")}`)
    lines.push(`DESCRIPTION:Tournament code ${tor.code}`)
    lines.push("END:VEVENT")
  })

  lines.push("END:VCALENDAR")
  return `${lines.join("\r\n")}\r\n`
}

export default function UpcomingCalendarTile({ tournaments, loading }: UpcomingCalendarTileProps) {
  const t = useTranslations("HomeDashboard")
  const locale = useLocale()
  const format = useFormatter()
  const upcomingTournaments = getUpcomingTournaments(tournaments)

  const handleExport = () => {
    if (upcomingTournaments.length === 0) return
    const icsData = buildIcsFile(upcomingTournaments)
    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "tdarts-upcoming-tournaments.ics"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <GlassmorphismCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold md:text-lg">{t("calendar.title")}</h2>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={upcomingTournaments.length === 0}>
          <IconDownload className="mr-1 h-4 w-4" />
          {t("calendar.export")}
        </Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl bg-muted/70" />
            <Skeleton className="h-16 w-full rounded-xl bg-muted/70" />
            <Skeleton className="h-16 w-full rounded-xl bg-muted/70" />
          </div>
        ) : upcomingTournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyTournaments")}</p>
        ) : (
          upcomingTournaments.map((tor) => (
            <Link
              key={tor._id}
              href={`/tournaments/${tor.code}`}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{tor.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconCalendarEvent className="h-3.5 w-3.5 shrink-0" />
                  {formatTournamentDate(tor.date, locale)}
                </p>
                <div className="mt-1.5">
                  <TournamentFormatBadges type={tor.tournamentType} participationMode={tor.participationMode} />
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <IconUsers className="h-3 w-3 shrink-0" />
                    {t("calendar.playerCount", {
                      current: tor.currentPlayers ?? 0,
                      max: tor.maxPlayers ?? 0,
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconCoin className="h-3 w-3 shrink-0" />
                    {t("calendar.entryFeeLabel")}:{" "}
                    {format.number(Number(tor.entryFee ?? 0), { style: "currency", currency: "HUF" })}
                  </span>
                </p>
              </div>
              <IconExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </GlassmorphismCard>
  )
}
