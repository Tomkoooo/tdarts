"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { IconQrcode, IconCopy, IconLogin, IconMapPin } from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Club } from "@/interface/club.interface"

interface ClubSummarySectionProps {
  club: Club
  code: string
  user?: {
    _id: string
  } | null
  onShareClick: () => void
}

export function ClubSummarySection({
  club,
  code,
  user,
  onShareClick,
}: ClubSummarySectionProps) {
  const router = useRouter()

  // Calculate stats
  const numPlayers = club.members.length
  const tournaments = club.tournaments || []
  const pastTournaments = tournaments.filter(t => t.tournamentSettings?.status === 'finished').length
  const ongoingTournaments = tournaments.filter(t => 
    t.tournamentSettings?.status === 'group-stage' || t.tournamentSettings?.status === 'knockout'
  ).length
  const upcomingTournaments = tournaments.filter(t => t.tournamentSettings?.status === 'pending').length
  const totalTournamentPlayers = tournaments.reduce((total, tournament) => {
    return total + (tournament.tournamentPlayers?.length || 0)
  }, 0)

  const handleCopyLink = () => {
    const loginLink = `${window.location.origin}/auth/login?redirect=${encodeURIComponent(`/clubs/${code}?page=tournaments`)}`
    navigator.clipboard.writeText(loginLink)
    toast.success('Bejelentkezési link másolva!')
  }

  return (
    <div className="space-y-6">
      {/* Club Info Card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {club.name}
              </h2>
              <p className="text-lg text-muted-foreground mb-3">
                {club.description}
              </p>
              <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <IconMapPin className="h-4 w-4" />
                  <span className="font-medium text-foreground">{club.location}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShareClick}
                  >
                    <IconQrcode className="w-4 h-4 mr-2" />
                    Megosztás
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                  >
                    <IconCopy className="w-4 h-4 mr-2" />
                    Link másolása
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShareClick}
                  >
                    <IconQrcode className="w-4 h-4 mr-2" />
                    Megosztás
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(`/clubs/${code}?page=tournaments`)}`)}
                  >
                    <IconLogin className="w-4 h-4 mr-2" />
                    Bejelentkezés
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-primary">
              {numPlayers}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              Játékos
            </span>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-accent">
              {pastTournaments}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              Befejezett verseny
            </span>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-green-500">
              {ongoingTournaments + upcomingTournaments}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              Aktív vagy közelgő
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold text-amber-500">
              {totalTournamentPlayers}
            </span>
            <span className="text-sm md:text-base text-muted-foreground mt-2">
              Összes versenyző
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ClubSummarySection

