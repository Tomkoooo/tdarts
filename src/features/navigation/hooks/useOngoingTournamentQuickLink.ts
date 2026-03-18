"use client"

import * as React from "react"
import { getUserTournamentsAction } from "@/features/tournaments/actions/getUserTournaments.action"

interface QuickTournamentLink {
  code: string
  name: string
}

const ONGOING_STATUS_PARTS = [
  "active",
  "live",
  "ongoing",
  "in_progress",
  "in-progress",
  "started",
  "group-stage",
  "knockout",
]

function isOngoingStatus(status?: string): boolean {
  const normalized = (status || "").toLowerCase()
  return ONGOING_STATUS_PARTS.some((part) => normalized.includes(part))
}

function isTodayDate(dateValue?: string | Date | null): boolean {
  if (!dateValue) return false
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export function useOngoingTournamentQuickLink(userId?: string) {
  const [ongoingTournament, setOngoingTournament] = React.useState<QuickTournamentLink | null>(null)

  React.useEffect(() => {
    if (!userId) {
      setOngoingTournament(null)
      return
    }

    let cancelled = false

    const loadOngoingTournament = async () => {
      try {
        const result = await getUserTournamentsAction({ limit: 10 })
        if (!result || typeof result !== "object" || !("success" in result) || !result.success) {
          return
        }
        const tournaments = Array.isArray(result.data) ? result.data : []
        const todayTournament = tournaments.find((item: any) =>
          isTodayDate(item?.tournamentSettings?.startDate || item?.startDate)
        )
        const ongoing = tournaments.find((item: any) => isOngoingStatus(item?.status))
        const quickTarget = todayTournament || ongoing
        if (!cancelled) {
          setOngoingTournament(
            quickTarget
              ? {
                  code: String(quickTarget.code || ""),
                  name: String(quickTarget.name || "Tournament"),
                }
              : null
          )
        }
      } catch (error) {
        if (!cancelled) {
          setOngoingTournament(null)
        }
      }
    }

    loadOngoingTournament()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { ongoingTournament }
}
