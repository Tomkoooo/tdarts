import React from "react"
import { User, Activity, Ticket } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface ProfileTabsProps {
  activeTab: "details" | "stats" | "tickets"
  onTabChange: (tab: "details" | "stats" | "tickets") => void
  ticketCount?: number
}

const TABS = [
  { id: "details" as const, labelKey: "details", icon: User },
  { id: "stats" as const, labelKey: "stats", icon: Activity },
  { id: "tickets" as const, labelKey: "tickets", icon: Ticket },
] as const

export default function ProfileTabs({ activeTab, onTabChange, ticketCount }: ProfileTabsProps) {
  const t = useTranslations("Profile.tabs")

  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="flex border-b border-border overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {TABS.map(({ id, labelKey, icon: Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(id)}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            {t(labelKey)}
            {id === "tickets" && ticketCount && ticketCount > 0 ? (
              <span className="ml-1 min-w-[1.2rem] h-5 flex items-center justify-center rounded-full text-xs font-semibold px-1.5 bg-primary text-primary-foreground">
                {ticketCount > 99 ? "99+" : ticketCount}
              </span>
            ) : null}
            {/* Active underline */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                aria-hidden
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
