"use client"

import React, { useEffect, useState } from "react"
import axios from "axios"
import { useUserContext } from "@/hooks/useUser"
import { useTranslations } from "next-intl"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { IconArrowRight, IconCalendarEvent, IconChartBar, IconSparkles, IconTargetArrow, IconTrophy } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import AnnouncementToast from "@/components/common/AnnouncementToast"
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets"

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

interface DashboardMetrics {
  matchesPlayed: number
  winRate: number
  tournamentsJoined: number
  avgCheckout: number
}

interface DashboardTournament {
  _id: string
  name: string
  code: string
  date?: string
  status?: string
}

export default function AuthenticatedHomeContent() {
  const t = useTranslations("HomeDashboard")
  const { user } = useUserContext()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [closedAnnouncements, setClosedAnnouncements] = useState<Set<string>>(new Set())
  const { unreadCount } = useUnreadTickets({ enabled: Boolean(user?._id) })
  const [ticketToastDismissed, setTicketToastDismissed] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    matchesPlayed: 0,
    winRate: 0,
    tournamentsJoined: 0,
    avgCheckout: 0,
  })
  const [upcomingTournaments, setUpcomingTournaments] = useState<DashboardTournament[]>([])

  useEffect(() => {
    const dismissed = localStorage.getItem("ticketToastDismissed")
    if (dismissed) setTicketToastDismissed(true)
  }, [])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get("/api/announcements", {
          headers: {
            "Accept-Language": typeof navigator !== "undefined" ? navigator.language : "hu",
          },
        })
        if (response.data.success) {
          const now = new Date()
          const activeAnnouncements = response.data.announcements.filter((announcement: Announcement) =>
            announcement.isActive && new Date(announcement.expiresAt) > now
          )
          setAnnouncements(activeAnnouncements)
        }
      } catch (error) {
        console.error("Error fetching announcements:", error)
      }
    }

    fetchAnnouncements()
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?._id) return
      setDashboardLoading(true)
      try {
        const [statsRes, tournamentsRes] = await Promise.allSettled([
          axios.get(`/api/players/stats/${user._id}`),
          axios.get(`/api/tournaments/user?userId=${user._id}`),
        ])

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          const stats = statsRes.value.data
          setMetrics({
            matchesPlayed: Number(stats.matchesPlayed || stats.totalMatches || 0),
            winRate: Number(stats.winRate || 0),
            tournamentsJoined: Number(stats.tournamentsPlayed || 0),
            avgCheckout: Number(stats.averageCheckout || 0),
          })
        }

        if (tournamentsRes.status === "fulfilled" && Array.isArray(tournamentsRes.value?.data)) {
          const list = tournamentsRes.value.data.slice(0, 5).map((item: any) => ({
            _id: String(item._id),
            name: item.name || "Tournament",
            code: item.code || item.tournamentCode || "",
            date: item.startDate || item.date,
            status: item.status || "pending",
          }))
          setUpcomingTournaments(list)
        }
      } catch (error) {
        console.error("Dashboard data fetch failed", error)
      } finally {
        setDashboardLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?._id])

  const handleCloseAnnouncement = (id: string) => {
    setClosedAnnouncements((prev) => new Set([...prev, id]))
    setAnnouncements((prev) => prev.filter((announcement) => announcement._id !== id))
  }

  const activeAnnouncements = announcements.filter((announcement) => !closedAnnouncements.has(announcement._id))

  const handleDismissTicketToast = () => {
    setTicketToastDismissed(true)
    localStorage.setItem("ticketToastDismissed", "true")
    setTimeout(() => {
      localStorage.removeItem("ticketToastDismissed")
    }, 60 * 60 * 1000)
  }

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

        <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-xl p-6 md:p-8 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10% 30%, var(--color-primary) 0%, transparent 40%), radial-gradient(circle at 85% 20%, var(--color-accent) 0%, transparent 35%)",
            }}
          />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("welcome")}</p>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
                {t("headline", { name: (user?.name || user?.username || "Player").split(" ")[0] })}
              </h1>
              <p className="mt-2 text-muted-foreground">{t("subheadline")}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/search?tab=tournaments">
                  <IconSparkles className="mr-2 h-4 w-4" />
                  {t("joinTournament")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile?tab=stats">
                  <IconChartBar className="mr-2 h-4 w-4" />
                  {t("viewStats")}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <GlassmorphismCard className="p-4 md:p-5">
            <p className="text-xs text-muted-foreground">{t("stats.matches")}</p>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={metrics.matchesPlayed} /></div>
          </GlassmorphismCard>
          <GlassmorphismCard className="p-4 md:p-5">
            <p className="text-xs text-muted-foreground">{t("stats.winRate")}</p>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={metrics.winRate} suffix="%" /></div>
          </GlassmorphismCard>
          <GlassmorphismCard className="p-4 md:p-5">
            <p className="text-xs text-muted-foreground">{t("stats.tournaments")}</p>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={metrics.tournamentsJoined} /></div>
          </GlassmorphismCard>
          <GlassmorphismCard className="p-4 md:p-5">
            <p className="text-xs text-muted-foreground">{t("stats.checkout")}</p>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={metrics.avgCheckout} /></div>
          </GlassmorphismCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <GlassmorphismCard className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("upcomingTitle")}</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/search?tab=tournaments">
                  {t("seeAll")} <IconArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {dashboardLoading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : upcomingTournaments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("emptyTournaments")}</p>
              ) : (
                upcomingTournaments.map((tor) => (
                  <Link
                    key={tor._id}
                    href={`/tournaments/${tor.code}`}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tor.name}</p>
                      <p className="text-xs text-muted-foreground">{tor.code}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconCalendarEvent className="h-3.5 w-3.5" />
                      <span>{tor.status}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </GlassmorphismCard>

          <div className="space-y-4">
            <GlassmorphismCard className="p-5">
              <h3 className="font-semibold">{t("quickActions")}</h3>
              <div className="mt-3 space-y-2">
                <Button asChild className="w-full justify-start">
                  <Link href="/board">
                    <IconTargetArrow className="mr-2 h-4 w-4" />
                    {t("actions.openBoard")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/myclub">
                    <IconTrophy className="mr-2 h-4 w-4" />
                    {t("actions.myClub")}
                  </Link>
                </Button>
              </div>
            </GlassmorphismCard>
          </div>
        </div>
      </div>
    </div>
  )
}
