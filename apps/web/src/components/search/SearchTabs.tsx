"use client"

import { useTranslations } from "next-intl"
import { IconWorld, IconTrophy, IconUsers, IconBuilding, IconStar, IconMap } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface SearchTabsProps {
    activeTab: string
    onTabChange: (tab: string) => void
    counts: {
        global: number
        tournaments: number
        players: number
        clubs: number
        leagues: number
        map?: number
    }
}

const TABS = [
    { value: "global",      icon: IconWorld,    labelKey: "tabs.global" },
    { value: "tournaments", icon: IconTrophy,   labelKey: "tabs.tournaments" },
    { value: "players",     icon: IconUsers,    labelKey: "tabs.players" },
    { value: "clubs",       icon: IconBuilding, labelKey: "tabs.clubs" },
    { value: "leagues",     icon: IconStar,     labelKey: "tabs.leagues" },
    { value: "map",         icon: IconMap,      labelKey: "tabs.map" },
] as const

export function SearchTabs({ activeTab, onTabChange, counts }: SearchTabsProps) {
    const t = useTranslations("Search")

    const getCount = (value: string) => {
        if (value === "map") return counts.map ?? 0
        return counts[value as keyof Omit<typeof counts, "map">] ?? 0
    }

    return (
        <div
            role="tablist"
            aria-label="Search categories"
            className="flex w-full gap-1 p-1 bg-card/60 border border-border rounded-xl backdrop-blur-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            {TABS.map(({ value, icon: Icon, labelKey }) => {
                const isActive = activeTab === value
                const count = getCount(value)
                return (
                    <button
                        key={value}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onTabChange(value)}
                        className={cn(
                            "relative flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden />
                        <span>{t(labelKey)}</span>
                        {count > 0 && (
                            <span
                                className={cn(
                                    "ml-1 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-xs font-semibold px-1.5 transition-colors",
                                    isActive
                                        ? "bg-primary-foreground/20 text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {count > 999 ? "999+" : count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
