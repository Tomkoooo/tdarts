"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useUserContext } from "@/hooks/useUser"
import AnnouncementToast from "@/components/common/AnnouncementToast"
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets"
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

export interface HomeInitialData {
  announcements: Announcement[]
  tournaments: HomeTournament[]
  leagueStandings: HomeLeagueStanding[]
  metrics: HomeMetrics
  advancedStatsEnabled: boolean
}

interface AuthenticatedHomeContentProps {
  initialData: HomeInitialData
  serverUserName?: string
  serverUsername?: string
  serverProfilePicture?: string
}

export default function AuthenticatedHomeContent({
  initialData,
  serverUserName,
  serverUsername,
  serverProfilePicture,
}: AuthenticatedHomeContentProps) {
  const { user } = useUserContext()
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialData.announcements || [])
  const [closedAnnouncements, setClosedAnnouncements] = useState<Set<string>>(new Set())
  const { unreadCount, loading: unreadLoading } = useUnreadTickets({ enabled: Boolean(user?._id) })
  const [ticketToastDismissed, setTicketToastDismissed] = useState(false)
  const [metrics] = useState<HomeMetrics>(initialData.metrics)
  const [upcomingTournaments] = useState<HomeTournament[]>(initialData.tournaments || [])
  const [leagueStandings] = useState<HomeLeagueStanding[]>(initialData.leagueStandings || [])
  const [advancedStatsEnabled] = useState(Boolean(initialData.advancedStatsEnabled))
  const [highlightUnreadNotifications, setHighlightUnreadNotifications] = useState(false)
  const notificationCenterRef = useRef<HTMLDivElement | null>(null)
  const dashboardLoading = false

  useEffect(() => {
    const dismissed = localStorage.getItem("ticketToastDismissed")
    if (dismissed) setTicketToastDismissed(true)
  }, [])

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
    () => (user?.name || user?.username || serverUserName || serverUsername || "Player").split(" ")[0],
    [serverUserName, serverUsername, user?.name, user?.username]
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
          profilePicture={user?.profilePicture || serverProfilePicture}
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
