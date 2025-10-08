'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import TournamentCard from '@/components/tournament/TournamentCard';
import PlayerCard from '@/components/player/PlayerCard';
import PlayerStatsModal from '@/components/player/PlayerStatsModal';
import Pagination from '@/components/common/Pagination';
import { IconSearch, IconFilter, IconX, IconList, IconCalendar, IconChevronLeft, IconChevronRight} from '@tabler/icons-react';

// Interfaces
interface SearchFilters {
  type: 'tournaments' | 'players' | 'clubs' | 'all';
  status?: string;
  format?: string;
  dateFrom?: string;
  dateTo?: string;
  minPlayers?: number;
  maxPlayers?: number;
  location?: string;
  tournamentType?: 'amateur' | 'open';
}

interface SearchResult {
  players?: any[];
  tournaments?: any[];
  clubs?: any[];
  totalResults: number;
}

// Helper functions
const isRegistrationClosed = (tournament: any) => {
  const now = new Date();
  const registrationDeadline = tournament.tournamentSettings?.registrationDeadline 
    ? new Date(tournament.tournamentSettings.registrationDeadline) 
    : null;
  return (registrationDeadline !== null && registrationDeadline < now) ||
         tournament.tournamentSettings?.status !== 'pending';
};

const isFutureTournament = (tournament: any) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of today
  const startDate = new Date(tournament.tournamentSettings?.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  // Only show pending tournaments that haven't started yet
  return tournament.tournamentSettings?.status === 'pending' && startDate >= now;
};

const formatDateHeader = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return 'Ma';
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Holnap';
  } else {
    return targetDate.toLocaleDateString('hu-HU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

const groupTournamentsByDate = (tournaments: any[]) => {
  const groups: { [key: string]: any[] } = {};
  
  tournaments
    .filter(isFutureTournament)
    .sort((a, b) => new Date(a.tournamentSettings.startDate).getTime() - new Date(b.tournamentSettings.startDate).getTime())
    .forEach(tournament => {
      const date = new Date(tournament.tournamentSettings.startDate);
      const dateKey = date.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tournament);
    });
    
  return groups;
};

const SearchPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State variables
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>({
    type: (searchParams.get('type') as any) || 'all',
    status: searchParams.get('status') || undefined,
    format: searchParams.get('format') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    minPlayers: searchParams.get('minPlayers') ? parseInt(searchParams.get('minPlayers')!) : undefined,
    maxPlayers: searchParams.get('maxPlayers') ? parseInt(searchParams.get('maxPlayers')!) : undefined,
    location: searchParams.get('location') || undefined,
    tournamentType: searchParams.get('tournamentType') as 'amateur' | 'open' || undefined,
  });

  // Update filters when URL params change
  useEffect(() => {
    const newType = (searchParams.get('type') as any) || 'all';
    setFilters(prev => ({ ...prev, type: newType }));
    setActiveTab(newType);
  }, [searchParams]);
  const [results, setResults] = useState<SearchResult>({ totalResults: 0 });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'tournaments' | 'players' | 'clubs'>(
    (searchParams.get('type') as any) || 'all'
  );
  console.log(activeTab);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [tournamentView, setTournamentView] = useState<'list' | 'calendar'>('list');
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [listViewMode, setListViewMode] = useState<'all' | 'navigation'>('all');

  // State for pagination
  const [playersPage, setPlayersPage] = useState(1);
  const [clubsPage, setClubsPage] = useState(1);
  const itemsPerPage = 6;
  
  const [topPlayersTotal, setTopPlayersTotal] = useState(0);

  // Initial page data
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [popularClubs, setPopularClubs] = useState<any[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim()) {
        setResults({ totalResults: 0 });
        return;
      }

      setLoading(true);
      try {
        const response = await axios.post('/api/search', {
          query: searchQuery,
          filters: searchFilters
        });
        
        if (response.data.success) {
          setResults(response.data.results);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Debounced suggestions function
  const debouncedSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await axios.get(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        if (response.data.success) {
          setSuggestions(response.data.suggestions);
        }
      } catch (error) {
        console.error('Suggestions error:', error);
      }
    }, 200),
    []
  );

  // Load initial data for the landing page view
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingInitial(true);
      try {
        const [tournamentsRes, playersRes, clubsRes] = await Promise.all([
          axios.get('/api/search/recent-tournaments?limit=50'),
          axios.get(`/api/search/top-players?page=${playersPage}&limit=${itemsPerPage}`),
          axios.get('/api/search/popular-clubs?limit=50')
        ]);

        if (tournamentsRes.data.success) {
          const futureTournaments = tournamentsRes.data.tournaments
            .filter(isFutureTournament)
            .sort((a: any, b: any) => {
              const aIsOpen = !isRegistrationClosed(a);
              const bIsOpen = !isRegistrationClosed(b);
              if (aIsOpen !== bIsOpen) return aIsOpen ? -1 : 1;
              return new Date(a.tournamentSettings.startDate).getTime() - new Date(b.tournamentSettings.startDate).getTime();
            });
          setRecentTournaments(futureTournaments);
        }
        if (playersRes.data.success) {
          setTopPlayers(playersRes.data.players);
          setTopPlayersTotal(playersRes.data.total);
        }
        if (clubsRes.data.success) setPopularClubs(clubsRes.data.clubs);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    loadInitialData();
  }, [playersPage]);

  // Handle search logic
  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query, filters);
    } else {
      setResults({ totalResults: 0 });
    }
    debouncedSuggestions(query);
  }, [query, filters, debouncedSearch, debouncedSuggestions]);

  // Load filtered data when no query but filters are set
  useEffect(() => {
    if (!query.trim() && filters.type !== 'all') {
      loadFilteredData();
    }
  }, [filters, query, playersPage]);

  const loadFilteredData = async () => {
    setLoading(true);
    try {
      const results: SearchResult = { totalResults: 0 };
      
      if (filters.type === 'tournaments') {
        // Load tournaments with date grouping and view options
        const tournamentsRes = await axios.get('/api/search/recent-tournaments?limit=50');
        if (tournamentsRes.data.success) {
          // Transform the data to match the search API structure
          results.tournaments = tournamentsRes.data.tournaments.map((tournament: any) => {
            const startDate = tournament.tournamentSettings?.startDate;
            const registrationDeadline = tournament.tournamentSettings?.registrationDeadline;
            const now = new Date();
            
            // Determine if registration is open based on deadline or start date
            let registrationOpen = true;
            
            if (registrationDeadline) {
              registrationOpen = registrationOpen && now < new Date(registrationDeadline);
            } else if (startDate) {
              registrationOpen = registrationOpen && now < new Date(startDate.getTime() - 60 * 60 * 1000); // 1 hour before start
            }

            return {
              registrationOpen: registrationOpen,
              tournament: tournament,
            };
          });
        }
      }
      
      if (filters.type === 'players') {
        // Load players with pagination (top players ranking)
        const playersRes = await axios.get(`/api/search/top-players?page=${playersPage}&limit=${itemsPerPage}`);
        if (playersRes.data.success) {
          results.players = playersRes.data.players;
          setTopPlayersTotal(playersRes.data.total);
        }
      }
      
      if (filters.type === 'clubs') {
        // Load clubs by popularity
        const clubsRes = await axios.get('/api/search/popular-clubs?limit=50');
        if (clubsRes.data.success) {
          results.clubs = clubsRes.data.clubs;
        }
      }
      
      results.totalResults = (results.tournaments?.length || 0) + 
                            (results.players?.length || 0) + 
                            (results.clubs?.length || 0);
      
      setResults(results);
    } catch (error) {
      console.error('Failed to load filtered data:', error);
    } finally {
      setLoading(false);
    }
  };



  // Update URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.format) params.set('format', filters.format);
    if (filters.location) params.set('location', filters.location);
    if (filters.minPlayers !== undefined) params.set('minPlayers', filters.minPlayers.toString());
    if (filters.maxPlayers !== undefined) params.set('maxPlayers', filters.maxPlayers.toString());
    if (filters.tournamentType) params.set('tournamentType', filters.tournamentType);
    
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [query, filters, router]);

  // Handle clicks outside search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setShowSuggestions(false);
  };

  const handleInputClick = () => {
    if (query.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: undefined,
      format: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minPlayers: undefined,
      maxPlayers: undefined,
      location: undefined,
      tournamentType: undefined
    });
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.status) count++;
    if (filters.format) count++;
    if (filters.location) count++;
    if (filters.minPlayers !== undefined) count++;
    if (filters.maxPlayers !== undefined) count++;
    if (filters.tournamentType) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const openPlayerModal = (player: any) => {
    setSelectedPlayer(player);
  };

  const closePlayerModal = () => {
    setSelectedPlayer(null);
  };

  // Calendar view component for tournaments - only shows days with tournaments
  const renderTournamentCalendar = (tournaments: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tournamentsByDate = groupTournamentsByDate(tournaments);
    const datesWithTournaments = Object.keys(tournamentsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (datesWithTournaments.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold mb-2">Nincsenek közelgő versenyek</h3>
          <p className="text-base-content/70">Próbáld meg később, vagy keress más kategóriában.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="text-sm text-base-content/60">
            {datesWithTournaments.length} nap versenyekkel
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {datesWithTournaments.map(dateKey => {
            const date = new Date(dateKey);
            const dayTournaments = tournamentsByDate[dateKey];
            const isToday = date.getTime() === today.getTime();
            const isTomorrow = date.getTime() === today.getTime() + 24 * 60 * 60 * 1000;
            
            return (
              <div key={dateKey} className={`border rounded-lg p-4 min-h-[140px] transition-all hover:shadow-md ${isToday ? 'border-primary bg-primary/5 shadow-lg' : isTomorrow ? 'border-secondary bg-secondary/5' : 'border-base-300 bg-base-100'}`}>
                <div className={`font-semibold text-sm mb-3 ${isToday ? 'text-primary' : isTomorrow ? 'text-secondary' : 'text-base-content/70'}`}>
                  {formatDateHeader(date)}
                  {isToday && <span className="ml-2 badge badge-primary badge-xs">Ma</span>}
                  {isTomorrow && <span className="ml-2 badge badge-secondary badge-xs">Holnap</span>}
                </div>
                
                <div className="text-xs text-base-content/60 mb-2">
                  {dayTournaments.length} verseny
                </div>
                
                <div className="space-y-2">
                  {dayTournaments.map(tournament => (
                    <div key={tournament._id} className="text-xs">
                      <Link href={`/tournaments/${tournament.tournamentId}`} className="block">
                        <div className={`p-2 rounded border-l-4 transition-all hover:shadow-md cursor-pointer ${isToday ? 'border-l-primary bg-primary/10 hover:bg-primary/15' : isTomorrow ? 'border-l-secondary bg-secondary/10 hover:bg-secondary/15' : 'border-l-accent bg-accent/10 hover:bg-accent/15'}`}>
                          <div className="font-medium text-xs text-base-content line-clamp-2 mb-1">
                            {tournament.tournamentSettings.name}
                          </div>
                          <div className="text-xs text-base-content/60">
                            🕐 {new Date(tournament.tournamentSettings.startDate).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-base-content/60">
                            👥 {tournament.tournamentPlayers?.length || 0}/{tournament.tournamentSettings.maxPlayers}
                          </div>
                          {tournament.tournamentSettings.location && (
                            <div className="text-xs text-base-content/50 truncate">
                              📍 {tournament.tournamentSettings.location}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Quick stats */}
        <div className="text-center text-sm text-base-content/60 mt-6">
          Összesen {tournaments.length} közelgő verseny {datesWithTournaments.length} napon
        </div>
      </div>
    );
  };

  // List view component for tournaments grouped by date with navigation
  const renderTournamentList = (tournaments: any[], showNavigation: boolean = false) => {
    const groupedTournaments = groupTournamentsByDate(tournaments);
    const sortedDates = Object.keys(groupedTournaments).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (sortedDates.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold mb-2">Nincsenek közelgő versenyek</h3>
          <p className="text-base-content/70">Próbáld meg később, vagy keress más kategóriában.</p>
        </div>
      );
    }

    // Navigation mode - show only current date
    if (showNavigation) {
      // Ensure current index is valid
      const validIndex = Math.min(currentDateIndex, sortedDates.length - 1);
      const currentDateKey = sortedDates[validIndex] || sortedDates[0];
      const date = new Date(currentDateKey);
      const dayTournaments = groupedTournaments[currentDateKey];
      
      return (
        <div className="space-y-6">
          {/* Navigation Header */}
          <div className="flex items-center justify-between">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDateIndex(Math.max(0, validIndex - 1))}
              disabled={validIndex === 0}
            >
              <IconChevronLeft className="w-4 h-4" />
              Előző nap
            </button>
            
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatDateHeader(date)}</div>
              <div className="text-sm text-base-content/60">
                {validIndex + 1} / {sortedDates.length} nap
              </div>
            </div>
            
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDateIndex(Math.min(sortedDates.length - 1, validIndex + 1))}
              disabled={validIndex >= sortedDates.length - 1}
            >
              Következő nap
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current Day Tournaments */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-xl font-bold text-primary">{formatDateHeader(date)}</h3>
              <div className="flex-1 h-px bg-base-300"></div>
              <span className="text-sm text-base-content/60">
                {dayTournaments.length} verseny
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayTournaments.map(tournament => (
                <TournamentCard key={tournament._id} tournament={tournament} />
              ))}
            </div>
          </div>

          {/* Quick Jump to Other Days */}
          <div className="mt-8">
            <h4 className="text-sm font-medium text-base-content/70 mb-3">Gyors ugrás:</h4>
            <div className="flex flex-wrap gap-2">
              {sortedDates.map((dateKey, index) => {
                const date = new Date(dateKey);
                const isActive = index === currentDateIndex;
                const tournamentsCount = groupedTournaments[dateKey].length;
                
                return (
                  <button
                    key={dateKey}
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCurrentDateIndex(index)}
                    title={formatDateHeader(date)}
                  >
                    <span className="text-xs">
                      {index === 0 ? 'Ma' : index === 1 ? 'Holnap' : `${date.getDate()}/${date.getMonth() + 1}`} ({tournamentsCount})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Standard mode - show all dates
    return (
      <div className="space-y-8">
        {sortedDates.map(dateKey => {
          const date = new Date(dateKey);
          const dayTournaments = groupedTournaments[dateKey];
          
          return (
            <div key={dateKey}>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-xl font-bold text-primary">{formatDateHeader(date)}</h3>
                <div className="flex-1 h-px bg-base-300"></div>
                <span className="text-sm text-base-content/60">
                  {dayTournaments.length} verseny
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayTournaments.map(tournament => (
                  <TournamentCard key={tournament._id} tournament={tournament} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render functions for different sections
  const renderSearchResults = () => (
    <div className="max-w-6xl mx-auto">
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {query ? `Eredmények: "${query}"` : `Szűrt eredmények: ${filters.type === 'tournaments' ? 'Tornák' : filters.type === 'players' ? 'Játékosok' : filters.type === 'clubs' ? 'Klubok' : 'Minden'}`}
            </h2>
            <p className="text-base-content/70">{results.totalResults} találat</p>
          </div>

          {results.totalResults === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">Nincs találat</h3>
              <p className="text-base-content/70">
                {query ? 'Próbáld meg másik keresési kifejezéssel.' : 'Próbáld meg másik szűrőket használni.'}
              </p>
            </div>
          ) : !query.trim() && filters.type !== 'all' ? (
            // Show filtered results without query
            <>
              {/* Only show tournaments if type is 'tournaments' */}
              {filters.type === 'tournaments' && results.tournaments && results.tournaments.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Tornák</h3>
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex gap-1">
                        <button
                          className={`btn btn-sm ${tournamentView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setTournamentView('list')}
                        >
                          <IconList className="w-4 h-4" />
                          Lista
                        </button>
                        <button
                          className={`btn btn-sm ${tournamentView === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setTournamentView('calendar')}
                        >
                          <IconCalendar className="w-4 h-4" />
                          Naptár
                        </button>
                      </div>
                      {tournamentView === 'list' && (
                        <div className="flex gap-1 border-l pl-2 items-center">
                          <button
                            className={`btn btn-xs ${listViewMode === 'all' ? 'btn-outline' : 'btn-ghost'}`}
                            onClick={() => {
                              setListViewMode('all');
                              setCurrentDateIndex(0);
                            }}
                          >
                            Összes
                          </button>
                          <button
                            className={`btn btn-xs ${listViewMode === 'navigation' ? 'btn-outline' : 'btn-ghost'}`}
                            onClick={() => {
                              setListViewMode('navigation');
                              setCurrentDateIndex(0);
                            }}
                          >
                            Navigálás
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {tournamentView === 'calendar' ? (
                    renderTournamentCalendar(results.tournaments.map(t => t.tournament))
                  ) : (
                    renderTournamentList(results.tournaments.map(t => t.tournament), listViewMode === 'navigation')
                  )}
                </section>
              )}
              
              {/* Only show players if type is 'players' */}
              {filters.type === 'players' && results.players && results.players.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Játékosok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.players.map((player) => (
                      <PlayerCard key={player._id} player={player} onClick={() => openPlayerModal(player)} />
                    ))}
                  </div>
                  {/* Pagination for players */}
                  <div className="mt-6 flex justify-center">
                    <Pagination
                      currentPage={playersPage}
                      totalPages={Math.ceil(topPlayersTotal / itemsPerPage)}
                      onPageChange={setPlayersPage}
                    />
                  </div>
                </section>
              )}
              
              {/* Only show clubs if type is 'clubs' */}
              {filters.type === 'clubs' && results.clubs && results.clubs.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Klubok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.clubs.map((club) => (
                      <Link key={club._id} href={`/clubs/${club._id}`}>
                        <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                          <div className="card-body">
                            <h4 className="card-title">{club.name}</h4>
                            <div className="text-sm text-base-content/70 space-y-1">
                              <p>Helyszín: {club.location}</p>
                              <p>Tagok: {club.memberCount}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              {/* Only show tournaments if type is 'all' or 'tournaments' */}
              {(filters.type === 'all' || filters.type === 'tournaments') && results.tournaments && results.tournaments.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Tornák</h3>
                    {filters.type === 'tournaments' && (
                      <div className="flex gap-2 flex-wrap">
                        <div className="flex gap-1">
                          <button
                            className={`btn btn-sm ${tournamentView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setTournamentView('list')}
                          >
                            <IconList className="w-4 h-4" />
                            Lista
                          </button>
                          <button
                            className={`btn btn-sm ${tournamentView === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setTournamentView('calendar')}
                          >
                            <IconCalendar className="w-4 h-4" />
                            Naptár
                          </button>
                        </div>
                        {tournamentView === 'list' && (
                          <div className="flex gap-1 border-l pl-2 items-center">
                            <button
                              className={`btn btn-xs ${listViewMode === 'all' ? 'btn-outline' : 'btn-ghost'}`}
                              onClick={() => {
                                setListViewMode('all');
                                setCurrentDateIndex(0);
                              }}
                            >
                              Összes
                            </button>
                            <button
                              className={`btn btn-xs ${listViewMode === 'navigation' ? 'btn-outline' : 'btn-ghost'}`}
                              onClick={() => {
                                setListViewMode('navigation');
                                setCurrentDateIndex(0);
                              }}
                            >
                              Navigálás
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {filters.type === 'tournaments' && tournamentView === 'calendar' ? (
                    renderTournamentCalendar(results.tournaments.map(t => t.tournament))
                  ) : filters.type === 'tournaments' && tournamentView === 'list' ? (
                    renderTournamentList(results.tournaments.map(t => t.tournament), listViewMode === 'navigation')
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.tournaments.slice(0, 6).map((t, index) => <TournamentCard key={index} tournament={t.tournament} />)}
                    </div>
                  )}
                </section>
              )}
              
              {/* Only show players if type is 'all' or 'players' */}
              {(filters.type === 'all' || filters.type === 'players') && results.players && results.players.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Játékosok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.players.map((player) => (
                      <PlayerCard key={player._id} player={player} onClick={() => openPlayerModal(player)} />
                    ))}
                  </div>
                </section>
              )}
              
              {/* Only show clubs if type is 'all' or 'clubs' */}
              {(filters.type === 'all' || filters.type === 'clubs') && results.clubs && results.clubs.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Klubok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.clubs.map((club) => (
                      <Link key={club._id} href={`/clubs/${club._id}`}>
                        <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                          <div className="card-body">
                            <h4 className="card-title">{club.name}</h4>
                            <div className="text-sm text-base-content/70 space-y-1">
                            <p>Helyszín: {club.location}</p>
                              <p>Tagok: {club.memberCount}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  const renderInitialView = () => (
          <div className="max-w-6xl mx-auto">
      {isLoadingInitial ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
                    </div>
                  ) : (
        <>
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Közelgő Tornák</h2>
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                  <button
                    className={`btn btn-sm ${tournamentView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTournamentView('list')}
                  >
                    <IconList className="w-4 h-4" />
                    Lista
                  </button>
                  <button
                    className={`btn btn-sm ${tournamentView === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTournamentView('calendar')}
                  >
                    <IconCalendar className="w-4 h-4" />
                    Naptár
                  </button>
                </div>
                {tournamentView === 'list' && (
                  <div className="flex gap-1 border-l pl-2 items-center">
                    <button
                      className={`btn btn-xs ${listViewMode === 'all' ? 'btn-outline' : 'btn-ghost'}`}
                      onClick={() => {
                        setListViewMode('all');
                        setCurrentDateIndex(0);
                      }}
                    >
                      Összes
                    </button>
                    <button
                      className={`btn btn-xs ${listViewMode === 'navigation' ? 'btn-outline' : 'btn-ghost'}`}
                      onClick={() => {
                        setListViewMode('navigation');
                        setCurrentDateIndex(0);
                      }}
                    >
                      Navigálás
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {tournamentView === 'calendar' ? (
              renderTournamentCalendar(recentTournaments)
            ) : (
              renderTournamentList(recentTournaments, listViewMode === 'navigation')
            )}
          </section>
          <div className="grid md:grid-cols-2 gap-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Top Játékosok</h2>
                      <div className="space-y-3">
                        {topPlayers.map((player, index) => (
                  <PlayerCard key={player._id} player={player} onClick={() => openPlayerModal(player)} rank={((playersPage - 1) * itemsPerPage) + index + 1} />
                ))}
              </div>
              <Pagination
                currentPage={playersPage}
                totalPages={Math.ceil(topPlayersTotal / itemsPerPage)}
                onPageChange={setPlayersPage}
              />
            </section>
            <section>
              <h2 className="text-2xl font-bold mb-4">Népszerű Klubbok</h2>
                    <div className="space-y-3 flex flex-col gap-2">
                {popularClubs
                  .slice((clubsPage - 1) * itemsPerPage, clubsPage * itemsPerPage)
                  .map((club, index) => (
                        <Link key={club._id} href={`/clubs/${club._id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-base-100 shadow hover:shadow-lg cursor-pointer transition-shadow">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">#{index + 1}</span>
                              <div>
                                <h4 className="font-semibold">{club.name}</h4>
                                <p>Helyszín: {club.location}</p>
                              <p>Tagok: {club.memberCount}</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                  ))
                }
              </div>
              <Pagination
                currentPage={clubsPage}
                totalPages={Math.ceil(popularClubs.length / itemsPerPage)}
                onPageChange={setClubsPage}
              />
            </section>
          </div>
        </>
      )}
                    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Search Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative search-container">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Keress tornára, játékosra, klubra..."
                    className="input input-lg input-bordered w-full pl-12 pr-12"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onClick={handleInputClick}
                  />
                  <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/50" />
                  {query && (
                    <button
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={() => setQuery('')}
                    >
                      <IconX size={20} />
                    </button>
                  )}
                </div>
              </div>
              <button
                className={`btn btn-lg ${showFilters ? 'btn-primary' : 'btn-ghost'} relative`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <IconFilter size={20} />
                {activeFiltersCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-content rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {activeFiltersCount}
                  </div>
                )}
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 mt-2">
                {suggestions.map((s, i) => <button key={i} onClick={() => handleSearch(s)} className="w-full text-left px-4 py-3 hover:bg-base-200 transition-colors">{s}</button>)}
              </div>
            )}
          </div>
          {query && (
            <div className="tabs tabs-boxed justify-center mt-4">
              <button className={`tab ${filters.type === 'all' ? 'tab-active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}>Minden</button>
              <button className={`tab ${filters.type === 'tournaments' ? 'tab-active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, type: 'tournaments' }))}>Tornák</button>
              <button className={`tab ${filters.type === 'players' ? 'tab-active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, type: 'players' }))}>Játékosok</button>
              <button className={`tab ${filters.type === 'clubs' ? 'tab-active' : ''}`} onClick={() => setFilters(prev => ({ ...prev, type: 'clubs' }))}>Klubok</button>
            </div>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="card-title">Szűrők</h3>
                  <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={clearFilters}
                  >
                    Szűrők törlése
                  </button>
                </div>
                
                {/* Content Type Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-semibold">Tartalom típusa:</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="label cursor-pointer">
                      <input
                        type="radio"
                        name="contentType"
                        className="radio radio-primary"
                        checked={filters.type === 'all'}
                        onChange={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                      />
                      <span className="label-text ml-2">Minden</span>
                    </label>
                    <label className="label cursor-pointer">
                      <input
                        type="radio"
                        name="contentType"
                        className="radio radio-primary"
                        checked={filters.type === 'tournaments'}
                        onChange={() => setFilters(prev => ({ ...prev, type: 'tournaments' }))}
                      />
                      <span className="label-text ml-2">Versenyek</span>
                    </label>
                    <label className="label cursor-pointer">
                      <input
                        type="radio"
                        name="contentType"
                        className="radio radio-primary"
                        checked={filters.type === 'players'}
                        onChange={() => setFilters(prev => ({ ...prev, type: 'players' }))}
                      />
                      <span className="label-text ml-2">Játékosok</span>
                    </label>
                    <label className="label cursor-pointer">
                      <input
                        type="radio"
                        name="contentType"
                        className="radio radio-primary"
                        checked={filters.type === 'clubs'}
                        onChange={() => setFilters(prev => ({ ...prev, type: 'clubs' }))}
                      />
                      <span className="label-text ml-2">Klubok</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {query || filters.type !== 'all' ? renderSearchResults() : renderInitialView()}
        
        <PlayerStatsModal player={selectedPlayer} onClose={closePlayerModal} />
      </div>
    </div>
  );
};

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default SearchPage;
