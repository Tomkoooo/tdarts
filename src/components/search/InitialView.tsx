
import * as React from "react"
import Link from "next/link"
import { IconMapPin, IconUsers, IconTrophy, IconCalendar, IconCheck, IconListCheck } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/Button"
import { TournamentResults } from "./TournamentResults"
import { QuickFilters } from "./QuickFilters"
import { SearchFiltersPanel } from "./SearchFilters"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { IconFilter } from "@tabler/icons-react"
import PlayerCard from "@/components/player/PlayerCard"
import Pagination from "@/components/common/Pagination"


interface InitialViewProps {
  recentTournaments: any[]
  topPlayers: any[]
  popularClubs: any[]
  activeLeagues: any[]
  loading: boolean
  playersPage: number
  topPlayersTotal: number
  clubsPage: number
  itemsPerPage: number
  onPlayersPageChange: (page: number) => void
  onClubsPageChange: (page: number) => void
  onPlayerClick: (player: any) => void
  onQuickAction?: (action: 'all-tournaments' | 'todays-tournaments' | 'active-tournaments' | 'finished-tournaments' | 'all-clubs') => void
  filters?: any
  onFilterChange?: (key: string, value: any) => void
  showAllTournaments?: boolean
  onToggleShowAll?: (show: boolean) => void
  hasActiveQuery?: boolean
}

export function InitialView({
  recentTournaments,
  topPlayers,
  popularClubs,
  activeLeagues,
  loading,
  playersPage,
  topPlayersTotal,
  clubsPage,
  itemsPerPage,
  onPlayersPageChange,
  onClubsPageChange,
  onPlayerClick,
  onQuickAction,
  filters,
  onFilterChange,
  showAllTournaments,
  onToggleShowAll,
  hasActiveQuery,
}: InitialViewProps) {
  // Return early if loading
  if (loading) {
    return (
      <div className="space-y-12">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Determine active view based on filters.type passed from parent
  const activeTab = filters?.type || 'tournaments';

  return (
    <div className="space-y-8">
      {/* Quick Actions - Only show on 'all' or 'tournaments' tab or if explicit? 
          Actually user implies 'Initial View' has these. Let's keep them at top. 
      */}
      {onQuickAction && activeTab === 'all' && (
        <section>
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Gyors Műveletek</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('all-tournaments')}
            >
              <IconTrophy size={24} className="text-primary" />
              <span className="text-sm font-medium">Összes Torna</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('todays-tournaments')}
            >
              <IconCalendar size={24} className="text-info" />
              <span className="text-sm font-medium">Mai Tornák</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('active-tournaments')}
            >
              <IconListCheck size={24} className="text-success" />
              <span className="text-sm font-medium">Aktív Tornák</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('finished-tournaments')}
            >
              <IconCheck size={24} className="text-warning" />
              <span className="text-sm font-medium">Lezárt Tornák</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('all-clubs')}
            >
              <IconUsers size={24} className="text-accent" />
              <span className="text-sm font-medium">Összes Klub</span>
            </Button>
          </div>
        </section>
      )}

      {/* Tournaments Section */}
      {(activeTab === 'tournaments' || activeTab === 'all') && (
        <section className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {hasActiveQuery ? 'Keresési Találatok' : (filters?.status === 'all' ? 'Összes Torna' : 'Közelgő Tornák')}
            </CardTitle>
          </CardHeader>
          
          <QuickFilters 
            filters={filters} 
            onFilterChange={(key, value) => onFilterChange && onFilterChange(key, value)}
            showAllTournaments={showAllTournaments}
            onToggleShowAll={onToggleShowAll}
          />

          <TournamentResults 
            tournaments={recentTournaments} 
            showViewToggle 
            filters={filters}
            onFilterChange={(newFilters) => onFilterChange && onFilterChange('multiple', newFilters)}
          />
        </section>
      )}

      {/* Rankings Section */}
      {(activeTab === 'players' || activeTab === 'all') && (
        <section className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Top Játékosok</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {topPlayers.map((player, index) => (
              <PlayerCard 
                key={player._id} 
                player={player} 
                onClick={() => onPlayerClick(player)} 
                rank={((playersPage - 1) * itemsPerPage) + index + 1} 
                showGlobalRank={true} 
              />
            ))}
          </div>
          {topPlayersTotal > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={playersPage}
                totalPages={Math.ceil(topPlayersTotal / itemsPerPage)}
                onPageChange={onPlayersPageChange}
              />
            </div>
          )}
        </section>
      )}

      {/* Clubs Section */}
      {(activeTab === 'clubs' || activeTab === 'all') && (
        <section className="space-y-6">
          <CardHeader className="px-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Népszerű klubok</CardTitle>
              {filters && onFilterChange && (
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="outline" size="sm" className="gap-2">
                       <IconFilter className="w-4 h-4" />
                       Szűrők
                     </Button>
                   </PopoverTrigger>
                 <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                     <div className="p-4">
                       <SearchFiltersPanel 
                          filters={filters} 
                          onFiltersChange={(newFilters) => onFilterChange('multiple', newFilters)}
                          onClear={() => onFilterChange('multiple', { type: filters.type, page: 1, limit: filters.limit })}
                          context="clubs"
                       />
                     </div>
                   </PopoverContent>
                 </Popover>
              )}
            </div>
          </CardHeader>
          <div className="space-y-4 flex flex-col">
            {popularClubs
              .slice((clubsPage - 1) * itemsPerPage, clubsPage * itemsPerPage)
              .map((club, index) => (
                <Link key={club._id} href={`/clubs/${club._id}`}>
                  <Card
                    className="bg-card/88 shadow-md shadow-black/20 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <span className="text-lg font-bold text-primary">
                          #{(clubsPage - 1) * itemsPerPage + index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="truncate text-lg font-semibold text-foreground">
                          {club.name}
                        </h4>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconMapPin className="h-3.5 w-3.5" />
                          {club.location}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconUsers className="h-3.5 w-3.5" />
                          {club.memberCount} tag
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
          {popularClubs.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={clubsPage}
                totalPages={Math.ceil(popularClubs.length / itemsPerPage)}
                onPageChange={onClubsPageChange}
              />
            </div>
          )}
        </section>
      )}

      {/* Leagues Section */}
      {(activeTab === 'leagues' || activeTab === 'all') && (
        <section className="space-y-6">
          <CardHeader className="px-0">
             <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Aktív Ligák</CardTitle>
              {filters && onFilterChange && (
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="outline" size="sm" className="gap-2">
                       <IconFilter className="w-4 h-4" />
                       Szűrők
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                     <div className="p-4">
                       <SearchFiltersPanel 
                          filters={filters} 
                          onFiltersChange={(newFilters) => onFilterChange('multiple', newFilters)}
                          onClear={() => onFilterChange('multiple', { type: filters.type, page: 1, limit: filters.limit })}
                          context="leagues"
                       />
                     </div>
                   </PopoverContent>
                 </Popover>
              )}
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLeagues.map((league) => (
              <Link key={league._id} href={`/leagues/${league._id}`}>
                <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-bold line-clamp-2">{league.name}</h4>
                      {league.verified && (
                        <span className="badge badge-success badge-sm shrink-0">OAC</span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground flex-1">
                      {league.club && (
                        <div className="flex items-center gap-2">
                          <IconUsers className="size-4" />
                          <span>{league.club.name}</span>
                        </div>
                      )}
                      {league.club?.location && (
                        <div className="flex items-center gap-2">
                          <IconMapPin className="size-4" />
                          <span>{league.club.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <IconCalendar className="size-4" />
                        <span>
                          {new Date(league.startDate).toLocaleDateString('hu-HU')} - 
                          {league.endDate ? new Date(league.endDate).toLocaleDateString('hu-HU') : 'Folyamatos'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex justify-end">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Megtekintés
                        <IconListCheck className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {activeLeagues.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nincsenek aktív ligák jelenleg.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default InitialView

