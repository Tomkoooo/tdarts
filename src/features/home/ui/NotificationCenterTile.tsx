"use client"

import Link from "next/link"
import { IconBell, IconChevronRight } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HomeNotifications } from "@/features/home/ui/types"

interface NotificationCenterTileProps {
  notifications: HomeNotifications
  loading?: boolean
  highlightUnread?: boolean
}

export default function NotificationCenterTile({
  notifications,
  loading = false,
  highlightUnread = false,
}: NotificationCenterTileProps) {
  const t = useTranslations("HomeDashboard")
  const totalUnread =
    notifications.unreadTickets + notifications.reminderCount + notifications.spotAvailabilityCount

  const items = [
    {
      key: "profile",
      label: t("notifications.profileActions"),
      value: t("notifications.profileActionsHint"),
      href: "/profile?tab=details",
    },
    {
      key: "feedback",
      label: t("notifications.feedbackResponses"),
      value: t("notifications.feedbackUnread", { count: notifications.unreadTickets }),
      href: "/profile?tab=tickets",
      unreadCount: notifications.unreadTickets,
    },
    {
      key: "reminders",
      label: t("notifications.tournamentReminders"),
      value: t("notifications.reminderCount", { count: notifications.reminderCount }),
      href: "/home",
      unreadCount: notifications.reminderCount,
    },
    {
      key: "spotAvailability",
      label: t("notifications.spotAvailability"),
      value: t("notifications.spotHint", { count: notifications.spotAvailabilityCount }),
      href: "/search?tab=tournaments",
      unreadCount: notifications.spotAvailabilityCount,
    },
  ]

  if (loading) {
    return (
      <GlassmorphismCard className="p-5">
        <Skeleton className="h-6 w-48 rounded-md bg-muted/70" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full rounded-xl bg-muted/70" />
          <Skeleton className="h-14 w-full rounded-xl bg-muted/70" />
          <Skeleton className="h-14 w-full rounded-xl bg-muted/70" />
          <Skeleton className="h-14 w-full rounded-xl bg-muted/70" />
        </div>
      </GlassmorphismCard>
    )
  }

  return (
    <GlassmorphismCard
      className={`p-5 transition-all duration-300 ${
        highlightUnread && totalUnread > 0 ? "ring-2 ring-warning/70 shadow-glow-primary" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBell className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold md:text-lg">{t("notifications.title")}</h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            totalUnread > 0 ? "bg-warning/30 text-warning-foreground" : "bg-primary/20 text-primary-foreground"
          }`}
        >
          {t("notifications.unread", { count: totalUnread })}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const unreadCount = item.unreadCount ?? 0
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                unreadCount > 0
                  ? `border-warning/45 bg-warning/10 hover:bg-warning/20 ${
                      highlightUnread ? "animate-pulse" : ""
                    }`
                  : "border-border/60 bg-background/50 hover:bg-muted/40"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.value}</p>
              </div>
              <IconChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )
        })}
      </div>
    </GlassmorphismCard>
  )
}
