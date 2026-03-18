"use client"

import { HomeTournament } from "@/features/home/ui/types"

const MS_IN_DAY = 24 * 60 * 60 * 1000

export function parseTournamentDate(date?: string | null): Date | null {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function getDaysUntil(date?: string | null): number | null {
  const parsedDate = parseTournamentDate(date)
  if (!parsedDate) return null
  const now = new Date()
  const diffMs = parsedDate.getTime() - now.getTime()
  return Math.ceil(diffMs / MS_IN_DAY)
}

export function getUpcomingTournaments(tournaments: HomeTournament[]): HomeTournament[] {
  const now = new Date()
  return tournaments
    .filter((item) => {
      const date = parseTournamentDate(item.date)
      return date && date.getTime() >= now.getTime() - MS_IN_DAY
    })
    .sort((a, b) => {
      const first = parseTournamentDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const second = parseTournamentDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return first - second
    })
}

export function getActiveOrNextTournament(tournaments: HomeTournament[]): HomeTournament | null {
  if (tournaments.length === 0) return null
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - MS_IN_DAY)
  const active = tournaments.find((item) => {
    const status = (item.status || "").toLowerCase()
    if (!(status.includes("active") || status.includes("live") || status.includes("ongoing") || status.includes("in_progress"))) {
      return false
    }
    const date = parseTournamentDate(item.date)
    if (!date) return true
    return date.getTime() >= oneDayAgo.getTime()
  })
  if (active) return active
  return getUpcomingTournaments(tournaments)[0] ?? null
}

export function formatTournamentDate(date?: string | null, locale?: string): string {
  const parsedDate = parseTournamentDate(date)
  if (!parsedDate) return "TBD"
  return new Intl.DateTimeFormat(locale || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate)
}
