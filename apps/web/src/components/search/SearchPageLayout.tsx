"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { IconSearch, IconX, IconFilter } from "@tabler/icons-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { AnimatedStat } from "@/components/ui/animated-stat"

interface SearchPageLayoutProps {
  query: string
  onQueryChange: (query: string) => void
  results: any[]
  isLoading?: boolean
  activeTab: string
  onTabChange: (tab: string) => void
  counts: Record<string, number>
  children?: React.ReactNode
}

export function SearchPageLayout({
  query,
  onQueryChange,
  results,
  isLoading = false,
  activeTab,
  onTabChange,
  counts,
  children
}: SearchPageLayoutProps) {
  const t = useTranslations("Search")
  const [showFilters, setShowFilters] = useState(false)

  const tabs = [
    { id: "tournaments", label: t("tabs.tournaments"), count: counts.tournaments || 0 },
    { id: "players", label: t("tabs.players"), count: counts.players || 0 },
    { id: "clubs", label: t("tabs.clubs"), count: counts.clubs || 0 },
    { id: "leagues", label: t("tabs.leagues"), count: counts.leagues || 0 }
  ]

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-primary/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Input */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <div className="relative">
                {isLoading ? (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                )}
                <Input
                  type="text"
                  placeholder={t("placeholder")}
                  className="h-12 pl-12 pr-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => onQueryChange("")}
                  >
                    <IconX className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              className="h-12 w-12"
              onClick={() => setShowFilters(!showFilters)}
            >
              <IconFilter className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 flex items-center gap-2 font-medium",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-glow-primary"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {tab.label}
                <Badge variant="secondary" className="text-xs">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Summary */}
        {query && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <AnimatedStat
              label="Tournaments"
              number={counts.tournaments || 0}
              icon="🎯"
            />
            <AnimatedStat
              label="Players"
              number={counts.players || 0}
              icon="👥"
            />
            <AnimatedStat
              label="Clubs"
              number={counts.clubs || 0}
              icon="🏢"
            />
            <AnimatedStat
              label="Leagues"
              number={counts.leagues || 0}
              icon="🏆"
            />
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 ? (
          <div className="grid gap-4">
            {results.map((result, idx) => (
              <GlassmorphismCard
                key={idx}
                className="p-6 hover:shadow-glow-primary transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {result.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {result.description}
                    </p>
                    {result.meta && (
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(result.meta).map(([key, value]) => (
                          <Badge key={key} variant="outline">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {result.action && (
                    <Button className="ml-4">
                      {result.action}
                    </Button>
                  )}
                </div>
              </GlassmorphismCard>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        ) : query ? (
          <GlassmorphismCard className="text-center p-12">
            <p className="text-muted-foreground mb-4">{t("noResults")}</p>
            <Button onClick={() => onQueryChange("")}>
              Clear Search
            </Button>
          </GlassmorphismCard>
        ) : (
          <GlassmorphismCard className="text-center p-12">
            <IconSearch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Start typing to search tournaments, players, and clubs
            </p>
          </GlassmorphismCard>
        )}

        {/* Children (for filters, additional content) */}
        {children}
      </div>
    </div>
  )
}

import { cn } from "@/lib/utils"
