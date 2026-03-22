"use client"

import {
  isLocalCalendarDayToday,
  isOnOrAfterLocalCalendarToday,
  isStrictlyAfterLocalCalendarToday,
} from "@/lib/local-calendar-date"
import { HomeTournament } from "@/features/home/ui/types"

const MS_IN_DAY = 24 * 60 * 60 * 1000

function normalizeTournamentStatus(status?: string | null): string {
  return String(status ?? "")
    .toLowerCase()
    .trim()
}

function isPendingTournamentStatus(status?: string | null): boolean {
  return normalizeTournamentStatus(status) === "pending"
}

/**
 * Home dashboard list rules (user's local calendar):
 * - Start date is **today**: include regardless of status.
 * - Start date is **after today**: include only if status is `pending`.
 * - Start date is **before today**: include only if status is not `pending` (e.g. ongoing / finished).
 */
export function filterUserHomeTournamentsForDashboard(tournaments: HomeTournament[]): HomeTournament[] {
  return tournaments.filter((tor) => {
    const date = parseTournamentDate(tor.date)
    if (!date) return true
    if (isLocalCalendarDayToday(tor.date)) return true
    if (isStrictlyAfterLocalCalendarToday(tor.date)) return isPendingTournamentStatus(tor.status)
    return !isPendingTournamentStatus(tor.status)
  })
}

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
  const base = filterUserHomeTournamentsForDashboard(tournaments)
  return base
    .filter((item) => {
      if (!item.date) return true
      return isOnOrAfterLocalCalendarToday(item.date)
    })
    .sort((a, b) => {
      const first = parseTournamentDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const second = parseTournamentDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return first - second
    })
}

export function getActiveOrNextTournament(tournaments: HomeTournament[]): HomeTournament | null {
  const list = filterUserHomeTournamentsForDashboard(tournaments)
  if (list.length === 0) return null
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - MS_IN_DAY)
  const active = list.find((item) => {
    const status = (item.status || "").toLowerCase()
    if (
      !(
        status.includes("active") ||
        status.includes("live") ||
        status.includes("ongoing") ||
        status.includes("in_progress") ||
        status.includes("group-stage") ||
        status.includes("knockout")
      )
    ) {
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
