"use client"

import * as React from "react"
import { IconList, IconCalendar, IconShieldCheck, IconRosette, IconFilter } from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SearchFiltersPanel } from "@/components/search/SearchFilters"
import TournamentCard from "@/components/tournament/TournamentCard"
import { useTranslations, useFormatter } from "next-intl"

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
  isVerified?: boolean
  isOac?: boolean
  city?: string
  clubId?: {
    _id: string
    name: string
  } | string
  league?: string
}

interface TournamentResultsProps {
  tournaments: Tournament[]
  showViewToggle?: boolean
  filters?: any
  onFilterChange?: (filters: any) => void
}

export function TournamentResults({
  tournaments,
  showViewToggle = false,
  filters,
  onFilterChange
}: TournamentResultsProps) {
  const t = useTranslations('Search.tournament_results')
  const format = useFormatter()
  const [view, setView] = React.useState<'list' | 'calendar'>('list')

  // Group tournaments by date
  const groupedTournaments = React.useMemo(() => {
    const groups: { [key: string]: Tournament[] } = {}
    
    tournaments
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

  const getDetailsLink = (tournament: Tournament) => {
    if (tournament.isOac && typeof tournament.clubId === 'object' && tournament.league) {
       // OAC tournaments link to the league view in the club page
       return `/clubs/${tournament.clubId._id}?page=leagues&league=${tournament.league}`
    }
    return `/tournaments/${tournament.tournamentId}`
  }

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
      return t('today')
    } else if (targetDate.getTime() === tomorrow.getTime()) {
      return t('tomorrow')
    } else {
      return format.dateTime(targetDate, {
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
        <h3 className="text-xl font-bold mb-2">{t('no_tournaments')}</h3>
        <p className="text-muted-foreground">
          {t('no_tournaments_desc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter and View Toggle */}
      <div className="flex justify-between items-center gap-2 px-1">
        {/* Filter Button - Always show if filters are available */}
        {filters && onFilterChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <IconFilter className="w-4 h-4" />
                {t('filters')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
              <div className="p-4">
                <SearchFiltersPanel 
                   filters={filters} 
                   onFiltersChange={onFilterChange} 
                   onClear={() => onFilterChange({ type: filters.type, page: 1, limit: filters.limit })}
                   context="tournaments"
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* View Toggle - Only show if enabled */}
        {showViewToggle && (
          <div className="flex gap-2 ml-auto">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
              className="gap-2"
            >
              <IconList className="w-4 h-4" />
              {t('list_view')}
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
              className="gap-2"
            >
              <IconCalendar className="w-4 h-4" />
              {t('calendar_view')}
            </Button>
          </div>
        )}
      </div>

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
                      <Badge variant="default" className="text-xs">{t('today_badge')}</Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {t('tournament_count', { count: dayTournaments.length })}
                  </div>
                  
                  <div className="space-y-2">
                    {dayTournaments.map(tournament => (
                      <Link 
                        key={tournament._id} 
                        href={getDetailsLink(tournament)}
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
                          <div className="flex items-center gap-2 mb-1">
                             {tournament.isVerified && (
                                <IconShieldCheck className="w-3 h-3 text-blue-500" />
                             )}
                             {tournament.isOac && (
                                <div className="flex items-center text-amber-500">
                                   <IconRosette className="w-3 h-3" />
                                   <span className="text-[10px] font-bold px-0.5">{t("oac_1o6p")}</span>
                                </div>
                             )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            🕐 {format.dateTime(new Date(tournament.tournamentSettings.startDate), {
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
                    {t('tournament_count', { count: dayTournaments.length })}
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
