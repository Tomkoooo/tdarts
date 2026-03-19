"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useUserContext } from "@/hooks/useUser"
import AnnouncementToast from "@/components/common/AnnouncementToast"
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets"
import { getPlayerStatsAction } from "@/features/profile/actions/getPlayerStats.action"
import { getLeagueHistoryAction } from "@/features/profile/actions/getLeagueHistory.action"
import { getUserTournamentsAction } from "@/features/tournaments/actions/getUserTournaments.action"
import { getActiveAnnouncementsAction } from "@/features/announcements/actions/getActiveAnnouncements.action"
import { checkFeatureFlagAction } from "@/features/feature-flags/actions/checkFeatureFlags.action"
import {
  HomeHeaderTile,
  HomeMetrics,
  HomeNotifications,
  HomeLeagueStanding,
  HomeTournament,
  LeagueStandingsTile,
  NotificationCenterTile,
  QuickStatsTileGrid,
  UpcomingCalendarTile,
} from "@/features/home/ui"
import { getActiveOrNextTournament, getDaysUntil, getUpcomingTournaments } from "@/features/home/ui/homeUtils"

interface Announcement {
  _id: string
  title: string
  description: string
  type: "info" | "success" | "warning" | "error"
  isActive: boolean
  showButton: boolean
  buttonText?: string
  buttonAction?: string
  duration: number
  expiresAt: string
}

export default function AuthenticatedHomeContent() {
  const { user } = useUserContext()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [closedAnnouncements, setClosedAnnouncements] = useState<Set<string>>(new Set())
  const { unreadCount, loading: unreadLoading } = useUnreadTickets({ enabled: Boolean(user?._id) })
  const [ticketToastDismissed, setTicketToastDismissed] = useState(false)
  const [primaryLoading, setPrimaryLoading] = useState(false)
  const [secondaryLoading, setSecondaryLoading] = useState(false)
  const [metrics, setMetrics] = useState<HomeMetrics>({
    matchesPlayed: 0,
    winRate: 0,
    tournamentsJoined: 0,
    currentRanking: null,
  })
  const [upcomingTournaments, setUpcomingTournaments] = useState<HomeTournament[]>([])
  const [leagueStandings, setLeagueStandings] = useState<HomeLeagueStanding[]>([])
  const [advancedStatsEnabled, setAdvancedStatsEnabled] = useState(false)
  const [highlightUnreadNotifications, setHighlightUnreadNotifications] = useState(false)
  const notificationCenterRef = useRef<HTMLDivElement | null>(null)
  const dashboardLoading = primaryLoading || secondaryLoading

  useEffect(() => {
    const dismissed = localStorage.getItem("ticketToastDismissed")
    if (dismissed) setTicketToastDismissed(true)
  }, [])

  useEffect(() => {
    let isCancelled = false
    const fetchAnnouncements = async () => {
      try {
        const response = await getActiveAnnouncementsAction({
          locale: typeof navigator !== "undefined" ? navigator.language : "hu",
        })
        if (
          response &&
          typeof response === "object" &&
          "success" in response &&
          response.success &&
          "announcements" in response &&
          Array.isArray((response as { announcements?: Announcement[] }).announcements)
        ) {
          const now = new Date()
          const activeAnnouncements = (response as { announcements: Announcement[] }).announcements.filter((announcement: Announcement) =>
            announcement.isActive && new Date(announcement.expiresAt) > now
          )
          if (!isCancelled) {
            setAnnouncements(activeAnnouncements)
          }
        }
      } catch (error) {
        console.error("Error fetching announcements:", error)
      }
    }

    fetchAnnouncements()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const fetchPrimaryHomeData = async () => {
      if (!user?._id) return
      if (!isCancelled) {
        setPrimaryLoading(true)
      }
      try {
        const tournamentsRes = await getUserTournamentsAction({ limit: 5 })
        if (
          tournamentsRes &&
          typeof tournamentsRes === "object" &&
          "success" in tournamentsRes &&
          tournamentsRes.success &&
          Array.isArray(tournamentsRes.data)
        ) {
          const list = tournamentsRes.data.map((item: any) => ({
            _id: String(item._id),
            name: item.name || "Tournament",
            code: item.code || item.tournamentCode || "",
            date: item.startDate || item.date,
            status: item.status || "pending",
            currentPlayers: Number(item.currentPlayers || 0),
            maxPlayers: Number(item.maxPlayers || 0),
            entryFee: Number(item.entryFee || 0),
            wins: Number(item.wins || 0),
            losses: Number(item.losses || 0),
            legsWon: Number(item.legsWon || 0),
            legsLost: Number(item.legsLost || 0),
            nextMatchType: item.nextMatchType || "unknown",
            nextMatchBoard: typeof item.nextMatchBoard === "number" ? item.nextMatchBoard : null,
          }))
          if (!isCancelled) {
            setUpcomingTournaments(list)
          }
        }
      } catch (error) {
        console.error("Primary dashboard fetch failed", error)
      } finally {
        if (!isCancelled) {
          setPrimaryLoading(false)
        }
      }
    }

    fetchPrimaryHomeData()

    return () => {
      isCancelled = true
    }
  }, [user?._id])

  useEffect(() => {
    let isCancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null

    const fetchDeferredHomeData = async () => {
      if (!user?._id) return
      if (!isCancelled) {
        setSecondaryLoading(true)
      }
      try {
        const [featureRes, statsRes, leaguesRes] = await Promise.allSettled([
          checkFeatureFlagAction({ feature: "ADVANCED_STATISTICS" }),
          getPlayerStatsAction(),
          getLeagueHistoryAction(),
        ])

        if (
          featureRes.status === "fulfilled" &&
          featureRes.value &&
          typeof featureRes.value === "object" &&
          "enabled" in featureRes.value
        ) {
          if (!isCancelled) {
            setAdvancedStatsEnabled(Boolean(featureRes.value.enabled))
          }
        }

        if (
          statsRes.status === "fulfilled" &&
          statsRes.value &&
          typeof statsRes.value === "object" &&
          "success" in statsRes.value &&
          statsRes.value.success
        ) {
          const stats = statsRes.value.data
          const summary = (stats?.summary || {}) as any
          const playerStats = (stats?.player?.stats || {}) as any
          const currentSeasonTournamentCount = Array.isArray(stats?.player?.tournamentHistory)
            ? stats.player.tournamentHistory.length
            : Number(summary.totalTournaments || 0)
          const previousSeasonsTournamentCount = Array.isArray(stats?.player?.previousSeasons)
            ? stats.player.previousSeasons.reduce(
                (acc: number, season: any) =>
                  acc + (Array.isArray(season?.tournamentHistory) ? season.tournamentHistory.length : 0),
                0
              )
            : 0
          const lifetimeTournamentCount = currentSeasonTournamentCount + previousSeasonsTournamentCount
          const globalRankRaw = stats?.player?.globalRank
          const globalRank = typeof globalRankRaw === "number" ? globalRankRaw : null
          if (!isCancelled) {
            setMetrics({
              matchesPlayed: Number(summary.wins || 0) + Number(summary.losses || 0),
              winRate: Number(summary.winRate || 0),
              tournamentsJoined: Math.max(
                lifetimeTournamentCount,
                Number(playerStats.tournamentsPlayed || 0),
                Number(summary.totalTournaments || 0)
              ),
              currentRanking: globalRank,
            })
          }
        }

        if (
          leaguesRes.status === "fulfilled" &&
          leaguesRes.value &&
          typeof leaguesRes.value === "object" &&
          "success" in leaguesRes.value &&
          leaguesRes.value.success &&
          Array.isArray(leaguesRes.value.data)
        ) {
          if (!isCancelled) {
            setLeagueStandings(leaguesRes.value.data as HomeLeagueStanding[])
          }
        }
      } catch (error) {
        console.error("Deferred dashboard fetch failed", error)
      } finally {
        if (!isCancelled) {
          setSecondaryLoading(false)
        }
      }
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as any).requestIdleCallback(fetchDeferredHomeData, { timeout: 1200 })
    } else {
      timeoutId = setTimeout(fetchDeferredHomeData, 200)
    }

    return () => {
      isCancelled = true
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        try {
          ;(window as any).cancelIdleCallback(idleId)
        } catch {}
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [user?._id])

  const handleCloseAnnouncement = (id: string) => {
    setClosedAnnouncements((prev) => new Set([...prev, id]))
    setAnnouncements((prev) => prev.filter((announcement) => announcement._id !== id))
  }

  const activeAnnouncements = useMemo(
    () => announcements.filter((announcement) => !closedAnnouncements.has(announcement._id)),
    [announcements, closedAnnouncements]
  )

  const handleDismissTicketToast = () => {
    setTicketToastDismissed(true)
    localStorage.setItem("ticketToastDismissed", "true")
    setTimeout(() => {
      localStorage.removeItem("ticketToastDismissed")
    }, 60 * 60 * 1000)
  }

  const handleNotificationWarningClick = () => {
    notificationCenterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setHighlightUnreadNotifications(true)
    window.setTimeout(() => setHighlightUnreadNotifications(false), 4000)
  }

  const activeOrNextTournament = useMemo(
    () => getActiveOrNextTournament(upcomingTournaments),
    [upcomingTournaments]
  )
  const upcomingOnly = useMemo(
    () => getUpcomingTournaments(upcomingTournaments),
    [upcomingTournaments]
  )
  const reminderCount = useMemo(
    () =>
      upcomingOnly.filter((tor) => {
        const daysUntil = getDaysUntil(tor.date)
        return daysUntil !== null && daysUntil >= 0 && daysUntil <= 7
      }).length,
    [upcomingOnly]
  )
  const notifications: HomeNotifications = useMemo(
    () => ({
      unreadTickets: unreadCount,
      reminderCount,
      spotAvailabilityCount: 0,
    }),
    [unreadCount, reminderCount]
  )
  const totalNotifications = useMemo(
    () => notifications.unreadTickets + notifications.reminderCount + notifications.spotAvailabilityCount,
    [notifications]
  )
  const firstName = useMemo(
    () => (user?.name || user?.username || "Player").split(" ")[0],
    [user?.name, user?.username]
  )

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {activeAnnouncements.length > 0 && (
          <div className="space-y-2">
            {activeAnnouncements.map((announcement, index) => (
              <div key={announcement._id} style={{ animationDelay: `${index * 120}ms` }} className="animate-slideInFromLeft">
                <AnnouncementToast announcement={announcement} onClose={handleCloseAnnouncement} />
              </div>
            ))}
          </div>
        )}

        {!ticketToastDismissed && (
          <UnreadTicketToast unreadCount={unreadCount} onDismiss={handleDismissTicketToast} />
        )}

        <HomeHeaderTile
          firstName={firstName}
          profilePicture={user?.profilePicture}
          activeOrNextTournament={activeOrNextTournament}
          notificationCount={totalNotifications}
          onNotificationWarningClick={handleNotificationWarningClick}
          loading={dashboardLoading}
        />

        <QuickStatsTileGrid
          metrics={metrics}
          loading={dashboardLoading}
          advancedStatsEnabled={advancedStatsEnabled}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <UpcomingCalendarTile tournaments={upcomingTournaments} loading={dashboardLoading} />
          </div>
          <div className="space-y-4">
            <LeagueStandingsTile standings={leagueStandings} loading={dashboardLoading} />
            <div ref={notificationCenterRef}>
              <NotificationCenterTile
                notifications={notifications}
                loading={dashboardLoading || unreadLoading}
                highlightUnread={highlightUnreadNotifications}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
