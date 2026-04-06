"use client"

import { getLocalDateKey, getTodayDateKey, getUserTimeZone } from "@/lib/date-time"
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

function userTzDayKey(value?: string | null): string | null {
  if (value == null || value === "") return null
  return getLocalDateKey(value, getUserTimeZone())
}

function isUserTzCalendarToday(value?: string | null): boolean {
  const dk = userTzDayKey(value)
  const today = getTodayDateKey(getUserTimeZone())
  return Boolean(dk && today && dk === today)
}

function isStrictlyAfterUserTzToday(value?: string | null): boolean {
  const dk = userTzDayKey(value)
  const today = getTodayDateKey(getUserTimeZone())
  return Boolean(dk && today && dk > today)
}

function isOnOrAfterUserTzToday(value?: string | null): boolean {
  const dk = userTzDayKey(value)
  const today = getTodayDateKey(getUserTimeZone())
  return Boolean(dk && today && dk >= today)
}

/**
 * Home dashboard list rules (user's IANA timezone via `getUserTimeZone()`, aligned with `user-timezone` when set):
 * - Start date is **today**: include regardless of status.
 * - Start date is **after today**: include only if status is `pending`.
 * - Start date is **before today**: include only if status is not `pending` (e.g. ongoing / finished).
 */
export function filterUserHomeTournamentsForDashboard(tournaments: HomeTournament[]): HomeTournament[] {
  return tournaments.filter((tor) => {
    const date = parseTournamentDate(tor.date)
    if (!date) return true
    if (isUserTzCalendarToday(tor.date)) return true
    if (isStrictlyAfterUserTzToday(tor.date)) return isPendingTournamentStatus(tor.status)
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
      return isOnOrAfterUserTzToday(item.date)
    })
    .sort((a, b) => {
      const first = parseTournamentDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const second = parseTournamentDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return first - second
    })
}

/**
 * Header "next" tile: prefer an ongoing-style tournament the user still cares about,
 * then the next item from the same dashboard list used by the calendar (not raw API rows).
 * Future dates with non-pending status are excluded upstream by `filterUserHomeTournamentsForDashboard`
 * so early-started events do not appear as "coming up" before their calendar day.
 */
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
  return getUpcomingTournaments(list)[0] ?? null
}

export function formatTournamentDate(date?: string | null, locale?: string): string {
  const parsedDate = parseTournamentDate(date)
  if (!parsedDate) return "TBD"
  return new Intl.DateTimeFormat(locale || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate)
}
