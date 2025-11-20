'use client'

import * as React from 'react'
import axios from 'axios'
import { useSearchParams, useRouter } from 'next/navigation'
import SearchHeader from '@/components/search/SearchHeader'
import SearchFiltersPanel from '@/components/search/SearchFilters'
import SearchTabs from '@/components/search/SearchTabs'
import TournamentResults from '@/components/search/TournamentResults'
import InitialView from '@/components/search/InitialView'
import EmptyState from '@/components/search/EmptyState'
import PlayerCard from '@/components/player/PlayerCard'
import PlayerStatsModal from '@/components/player/PlayerStatsModal'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import Link from 'next/link'
import { IconMoodSad, IconMapPin, IconUsers } from '@tabler/icons-react'
import Pagination from "@/components/common/Pagination"
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Interfaces
interface SearchFilters {
  type: 'tournaments' | 'players' | 'clubs' | 'all'
  status?: string
  format?: string
  dateFrom?: string
  dateTo?: string
  minPlayers?: number
  maxPlayers?: number
  location?: string
  tournamentType?: 'amateur' | 'open'
  page?: number
  limit?: number
}

interface SearchResult {
  players?: any[]
  tournaments?: any[]
  clubs?: any[]
  totalResults: number
  totalPages?: number
  currentPage?: number
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Helper to get initial filters based on URL params
  const getInitialFilters = (): SearchFilters => {
    const type = (searchParams.get('type') as any) || 'all'
    const filters: SearchFilters = {
      type,
      page: 1,
      limit: 12
    }
    
    // If navigating to tournaments from navbar (type=tournaments without other params), show all tournaments from today
    if (type === 'tournaments' && !searchParams.get('q') && !searchParams.get('status') && !searchParams.get('dateFrom')) {
      const today = new Date().toISOString().split('T')[0]
      const endDate = new Date("2225-12-31").toISOString().split('T')[0]
      filters.dateFrom = today
      filters.dateTo = endDate
    } else {
      // Use URL params if they exist
      if (searchParams.get('status')) filters.status = searchParams.get('status') || undefined
      if (searchParams.get('dateFrom')) filters.dateFrom = searchParams.get('dateFrom') || undefined
      if (searchParams.get('dateTo')) filters.dateTo = searchParams.get('dateTo') || undefined
    }
    
    return filters
  }

  // State
  const [query, setQuery] = React.useState(searchParams.get('q') || '')
  const [filters, setFilters] = React.useState<SearchFilters>(getInitialFilters())
  const [results, setResults] = React.useState<SearchResult>({ totalResults: 0 })
  const [loading, setLoading] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [selectedPlayer, setSelectedPlayer] = React.useState<any>(null)
  
  // Pagination for initial view
  const [playersPage, setPlayersPage] = React.useState(1)
  const [clubsPage, setClubsPage] = React.useState(1)
  const itemsPerPage = 6
  
  // Helper handlers
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setFilters(prev => ({ ...prev, page: 1 }))
  }

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters({ ...newFilters, page: 1 })
  }
  
  // Initial data
  const [recentTournaments, setRecentTournaments] = React.useState<any[]>([])
  const [topPlayers, setTopPlayers] = React.useState<any[]>([])
  const [popularClubs, setPopularClubs] = React.useState<any[]>([])
  const [topPlayersTotal, setTopPlayersTotal] = React.useState(0)
  const [isLoadingInitial, setIsLoadingInitial] = React.useState(true)

  // Helper to check if tournament is in future
  const isFutureTournament = (tournament: any) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const startDate = new Date(tournament.tournamentSettings?.startDate)
    startDate.setHours(0, 0, 0, 0)
    return tournament.tournamentSettings?.status === 'pending' && startDate >= now
  }

  // Handle quick actions
  const handleQuickAction = (action: 'all-tournaments' | 'todays-tournaments' | 'active-tournaments' | 'finished-tournaments' | 'all-clubs') => {
    // Reset query when using quick actions
    setQuery('')
    
    switch (action) {
      case 'all-tournaments':
        const todayAll = new Date().toISOString().split('T')[0]
        const endDateAll = new Date("2225-12-31").toISOString().split('T')[0]
        setFilters({ type: 'tournaments', dateFrom: todayAll, dateTo: endDateAll, page: 1 })
        break
      case 'todays-tournaments':
        const todayTodays = new Date().toISOString().split('T')[0]
        const endDateTodays = new Date("2225-12-31").toISOString().split('T')[0]
        setFilters({ type: 'tournaments', dateFrom: todayTodays, dateTo: endDateTodays, page: 1 })
        break
      case 'active-tournaments':
        setFilters({ type: 'tournaments', status: 'active', page: 1 })
        break
      case 'finished-tournaments':
        setFilters({ type: 'tournaments', status: 'finished', page: 1 })
        break
      case 'all-clubs':
        setFilters({ type: 'clubs', page: 1 })
        break
    }
  }

  // Load initial data (only for initial view when no filters/query)
  React.useEffect(() => {
    const loadInitialData = async () => {
      // Only load initial view data if there are no active filters or query
      const hasActiveFilters = 
        filters.type !== 'all' ||
        filters.status || 
        filters.format || 
        filters.dateFrom || 
        filters.dateTo || 
        filters.minPlayers || 
        filters.maxPlayers || 
        filters.location || 
        filters.tournamentType ||
        query.trim()

      if (hasActiveFilters) {
        setIsLoadingInitial(false)
        return
      }

      setIsLoadingInitial(true)
      try {
        // No params - load all data for initial view
          const [tournamentsRes, playersRes, clubsRes] = await Promise.all([
            axios.get('/api/search/recent-tournaments?limit=50'),
            axios.get(`/api/search/top-players?page=${playersPage}&limit=${itemsPerPage}`),
            axios.get('/api/search/popular-clubs?limit=50')
          ])

          if (tournamentsRes.data.success) {
            const futureTournaments = tournamentsRes.data.tournaments.filter(isFutureTournament)
            setRecentTournaments(futureTournaments)
          }
          if (playersRes.data.success) {
            setTopPlayers(playersRes.data.players)
            setTopPlayersTotal(playersRes.data.total)
          }
          if (clubsRes.data.success) {
            setPopularClubs(clubsRes.data.clubs)
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setIsLoadingInitial(false)
      }
    }

    loadInitialData()
  }, [playersPage, filters.type, filters.status, filters.dateFrom, filters.dateTo, query])

  // Debounced search
  const debouncedSearch = React.useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      // Check if we have any active filters
      const hasActiveFilters = 
        searchFilters.status || 
        searchFilters.format || 
        searchFilters.dateFrom || 
        searchFilters.dateTo || 
        searchFilters.minPlayers || 
        searchFilters.maxPlayers || 
        searchFilters.location || 
        searchFilters.tournamentType ||
        (searchFilters.type !== 'all') // Treat type change as filter too

      // Only search if we have a query OR active filters
      if (!searchQuery.trim() && !hasActiveFilters) {
        setResults({ totalResults: 0 })
        return
      }

      setLoading(true)
      try {
        const response = await axios.post('/api/search', {
          query: searchQuery,
          filters: searchFilters
        })
        
        if (response.data.success) {
          setResults(response.data.results)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 500),
    []
  )

  // Debounced suggestions
  const debouncedSuggestions = React.useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([])
        return
      }

      try {
        const response = await axios.get(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        if (response.data.success) {
          setSuggestions(response.data.suggestions)
        }
      } catch (error) {
        console.error('Suggestions error:', error)
      }
    }, 300),
    []
  )

  // Handle search
  React.useEffect(() => {
    // Check if we have any active filters
    const hasActiveFilters = 
      filters.status || 
      filters.format || 
      filters.dateFrom || 
      filters.dateTo || 
      filters.minPlayers || 
      filters.maxPlayers || 
      filters.location || 
      filters.tournamentType ||
      (filters.type !== 'all') // Treat type change as filter too

    // Search if we have query OR active filters
    if (query.trim() || hasActiveFilters) {
      debouncedSearch(query, filters)
    } else {
      setResults({ totalResults: 0 })
    }
    
    // Only show suggestions if there's a query
    if (query.trim()) {
      debouncedSuggestions(query)
    } else {
      setSuggestions([])
    }
  }, [query, filters])

  // Update URL
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.status) params.set('status', filters.status)
    if (filters.format) params.set('format', filters.format)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.minPlayers) params.set('minPlayers', filters.minPlayers.toString())
    if (filters.maxPlayers) params.set('maxPlayers', filters.maxPlayers.toString())
    if (filters.location) params.set('location', filters.location)
    if (filters.tournamentType) params.set('tournamentType', filters.tournamentType)
    
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newUrl, { scroll: false })
  }, [query, filters, router])

  // Click outside handler for suggestions
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (filters.type !== 'all') count++
    if (filters.status) count++
    if (filters.format) count++
    if (filters.dateFrom) count++
    if (filters.dateTo) count++
    if (filters.minPlayers) count++
    if (filters.maxPlayers) count++
    if (filters.location) count++
    if (filters.tournamentType) count++
    return count
  }, [filters])

  // Clear filters
  const clearFilters = () => {
    setFilters({ type: 'all', page: 1 })
  }

  // Render search results
  const renderSearchResults = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      )
    }

    if (results.totalResults === 0) {
      return (
        <EmptyState
          title="Nincs találat"
          description={query ? 'Próbáld meg másik keresési kifejezéssel.' : 'Próbáld meg másik szűrőket használni.'}
          icon={<IconMoodSad className="w-10 h-10 text-muted-foreground" />}
        />
      )
    }

    return (
      <div className="space-y-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">
            {query ? `Eredmények: "${query}"` : 'Szűrt eredmények'}
          </h2>
          <p className="text-muted-foreground">{results.totalResults} találat</p>
        </div>

        {/* Tournaments */}
        {results.tournaments && results.tournaments.length > 0 && (
          <section>
            <CardHeader className="px-0">
              <CardTitle className="text-2xl">Tornák</CardTitle>
            </CardHeader>
            <TournamentResults 
              tournaments={results.tournaments.map(t => t.tournament)} 
              showViewToggle={filters.type === 'tournaments'}
            />
          </section>
        )}

        {/* Players */}
        {results.players && results.players.length > 0 && (
          <section>
            <CardHeader className="px-0">
              <CardTitle className="text-2xl">Játékosok</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.players.map((player) => (
                <PlayerCard 
                  key={player._id} 
                  player={player} 
                  onClick={() => setSelectedPlayer(player)} 
                  showGlobalRank 
                />
              ))}
            </div>
          </section>
        )}

        {/* Clubs */}
        {results.clubs && results.clubs.length > 0 && (
          <section>
            <CardHeader className="px-0">
              <CardTitle className="text-2xl">Klubok</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.clubs.map((club) => (
                <Link key={club._id} href={`/clubs/${club._id}`}>
                  <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-2xl bg-card/95 border-0">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-lg font-semibold text-foreground">{club.name}</h4>
                      </div>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <IconMapPin className="h-4 w-4 text-primary/70" />
                          <span className="text-foreground">{club.location || 'Nincs megadva helyszín'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IconUsers className="h-4 w-4 text-primary/70" />
                          <span className="text-foreground">{club.memberCount} tag</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Pagination */}
        {filters.type !== 'all' && results.totalPages && results.totalPages > 1 && (
          <Pagination
            currentPage={filters.page || 1}
            totalPages={results.totalPages}
            onPageChange={(page) => {
              setFilters(prev => ({ ...prev, page }))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Search Header */}
        <div className="max-w-4xl mx-auto mb-8 space-y-6">
          <SearchHeader
            query={query}
            onQueryChange={handleQueryChange}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onSuggestionClick={handleQueryChange}
            onSuggestionsToggle={setShowSuggestions}
            showFilters={showFilters}
            onFiltersToggle={() => setShowFilters(!showFilters)}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Tabs (only shown when searching) */}
          {query && (
            <SearchTabs
              activeTab={filters.type}
              onTabChange={(type) => setFilters({ ...filters, type, page: 1 })}
            />
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="max-w-4xl mx-auto mb-8">
            <SearchFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClear={clearFilters}
            />
          </div>
        )}

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {query || filters.type !== 'all' ? (
            renderSearchResults()
          ) : (
            <InitialView
              recentTournaments={recentTournaments}
              topPlayers={topPlayers}
              popularClubs={popularClubs}
              loading={isLoadingInitial}
              playersPage={playersPage}
              topPlayersTotal={topPlayersTotal}
              clubsPage={clubsPage}
              itemsPerPage={itemsPerPage}
              onPlayersPageChange={setPlayersPage}
              onClubsPageChange={setClubsPage}
              onPlayerClick={setSelectedPlayer}
              onQuickAction={handleQuickAction}
            />
          )}
        </div>

        {/* Player Modal */}
        <PlayerStatsModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      </div>
    </div>
  )
}
