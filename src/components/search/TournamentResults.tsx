"use client"

import * as React from "react"
import { IconList, IconCalendar } from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import TournamentCard from "@/components/tournament/TournamentCard"

interface Tournament {
  _id: string
  tournamentId: string
  tournamentSettings: {
    name: string
    startDate: string
    location?: string
    maxPlayers: number
    status: string
  }
  tournamentPlayers?: any[]
}

interface TournamentResultsProps {
  tournaments: Tournament[]
  showViewToggle?: boolean
}

export function TournamentResults({
  tournaments,
  showViewToggle = false,
}: TournamentResultsProps) {
  const [view, setView] = React.useState<'list' | 'calendar'>('list')

  // Helper function to check if tournament is in the future
  const isFutureTournament = (tournament: Tournament) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const startDate = new Date(tournament.tournamentSettings?.startDate)
    startDate.setHours(0, 0, 0, 0)
    return tournament.tournamentSettings?.status === 'pending' && startDate >= now
  }

  // Group tournaments by date
  const groupedTournaments = React.useMemo(() => {
    const groups: { [key: string]: Tournament[] } = {}
    
    tournaments
      .filter(isFutureTournament)
      .sort((a, b) => 
        new Date(a.tournamentSettings.startDate).getTime() - 
        new Date(b.tournamentSettings.startDate).getTime()
      )
      .forEach(tournament => {
        const date = new Date(tournament.tournamentSettings.startDate)
        const dateKey = date.toDateString()
        
        if (!groups[dateKey]) {
          groups[dateKey] = []
        }
        groups[dateKey].push(tournament)
      })
      
    return groups
  }, [tournaments])

  const sortedDates = Object.keys(groupedTournaments).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  // Format date header
  const formatDateHeader = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    if (targetDate.getTime() === today.getTime()) {
      return 'Ma'
    } else if (targetDate.getTime() === tomorrow.getTime()) {
      return 'Holnap'
    } else {
      return targetDate.toLocaleDateString('hu-HU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <IconCalendar className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">Nincsenek közelgő versenyek</h3>
        <p className="text-muted-foreground">
          Próbáld meg később, vagy keress más kategóriában.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      {showViewToggle && (
        <div className="flex justify-end gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
            className="gap-2"
          >
            <IconList className="w-4 h-4" />
            Lista
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
            className="gap-2"
          >
            <IconCalendar className="w-4 h-4" />
            Naptár
          </Button>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedDates.map(dateKey => {
            const date = new Date(dateKey)
            const dayTournaments = groupedTournaments[dateKey]
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const isToday = date.getTime() === today.getTime()
            
            return (
              <Card 
                key={dateKey}
                className={`transition-all hover:shadow-lg ${
                  isToday 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-sm ${
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {formatDateHeader(date)}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-xs">Ma</Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {dayTournaments.length} verseny
                  </div>
                  
                  <div className="space-y-2">
                    {dayTournaments.map(tournament => (
                      <Link 
                        key={tournament._id} 
                        href={`/tournaments/${tournament.tournamentId}`}
                        className="block"
                      >
                        <div className={`p-2 rounded border-l-4 transition-all hover:shadow-md ${
                          isToday 
                            ? 'border-l-primary bg-primary/10 hover:bg-primary/15' 
                            : 'border-l-accent bg-accent/10 hover:bg-accent/15'
                        }`}>
                          <div className="font-medium text-xs line-clamp-2 mb-1">
                            {tournament.tournamentSettings.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            🕐 {new Date(tournament.tournamentSettings.startDate).toLocaleTimeString('hu-HU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            👥 {tournament.tournamentPlayers?.length || 0}/{tournament.tournamentSettings.maxPlayers}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-8">
          {sortedDates.map(dateKey => {
            const date = new Date(dateKey)
            const dayTournaments = groupedTournaments[dateKey]
            
            return (
              <div key={dateKey} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-primary">
                    {formatDateHeader(date)}
                  </h3>
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-sm text-muted-foreground">
                    {dayTournaments.length} verseny
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayTournaments.map(tournament => (
                    <TournamentCard 
                      key={tournament._id} 
                      tournament={tournament} 
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TournamentResults

