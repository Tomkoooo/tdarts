"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { IconMap, IconZoomIn, IconZoomOut, IconSearch, IconFilter } from "@tabler/icons-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { Badge } from "@/components/ui/Badge"

interface MapPageLayoutProps {
  tournaments?: any[]
  isLoading?: boolean
  onTournamentSelect?: (tournament: any) => void
  children?: React.ReactNode
}

export function MapPageLayout({
  tournaments = [],
  isLoading = false,
  onTournamentSelect,
  children
}: MapPageLayoutProps) {
  const t = useTranslations("Map")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTournament, setSelectedTournament] = useState<any>(null)

  const handleTournamentClick = (tournament: any) => {
    setSelectedTournament(tournament)
    onTournamentSelect?.(tournament)
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Map Header */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-primary/10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <IconMap className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("title")}</h1>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <IconFilter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 flex gap-4 overflow-hidden p-4">
        {/* Map Area */}
        <div className="flex-1 relative rounded-lg overflow-hidden border border-primary/10 bg-muted">
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <div className="text-center">
              <IconMap className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Map view integration coming soon</p>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button size="icon" variant="outline" className="bg-background/80 backdrop-blur">
              <IconZoomIn className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline" className="bg-background/80 backdrop-blur">
              <IconZoomOut className="w-5 h-5" />
            </Button>
          </div>

          {/* Current Location Button */}
          <div className="absolute bottom-4 left-4">
            <Button variant="outline" className="bg-background/80 backdrop-blur">
              📍 {t("currentLocation")}
            </Button>
          </div>
        </div>

        {/* Sidebar with Tournament List */}
        <div className="w-full sm:w-80 flex flex-col gap-4">
          {/* Header */}
          <GlassmorphismCard className="p-4 shrink-0">
            <h2 className="text-lg font-semibold mb-2">Tournaments</h2>
            <Badge className="text-xs">
              {tournaments.length} {tournaments.length === 1 ? "tournament" : "tournaments"}
            </Badge>
          </GlassmorphismCard>

          {/* Tournament List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tournaments.length > 0 ? (
              tournaments.map((tournament, idx) => (
                <GlassmorphismCard
                  key={idx}
                  className={`p-4 cursor-pointer transition-all hover:shadow-glow-primary ${
                    selectedTournament?.id === tournament.id
                      ? "ring-2 ring-primary shadow-glow-primary"
                      : ""
                  }`}
                  onClick={() => handleTournamentClick(tournament)}
                >
                  <h3 className="font-semibold text-sm truncate">{tournament.name}</h3>
                  <p className="text-xs text-muted-foreground">{tournament.location}</p>
                  {tournament.date && (
                    <p className="text-xs text-muted-foreground mt-2">{tournament.date}</p>
                  )}
                  {tournament.players && (
                    <p className="text-xs text-primary mt-2">
                      👥 {tournament.players} players
                    </p>
                  )}
                </GlassmorphismCard>
              ))
            ) : (
              <GlassmorphismCard className="p-8 text-center">
                <p className="text-muted-foreground text-sm">{t("noTournaments")}</p>
              </GlassmorphismCard>
            )}
          </div>

          {/* Selected Tournament Details */}
          {selectedTournament && (
            <GlassmorphismCard className="p-4 shrink-0 border-t border-primary/10">
              <h3 className="font-semibold mb-3">{selectedTournament.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{selectedTournament.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{selectedTournament.players}</span>
                </div>
                <Button className="w-full mt-4">View Details</Button>
              </div>
            </GlassmorphismCard>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
