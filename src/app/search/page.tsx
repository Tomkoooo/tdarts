'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface SearchFilters {
  type: 'players' | 'tournaments' | 'clubs' | 'all';
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

const SearchPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
  
  const [results, setResults] = useState<SearchResult>({ totalResults: 0 });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [popularClubs, setPopularClubs] = useState<any[]>([]);

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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [tournamentsRes, playersRes, clubsRes] = await Promise.all([
          axios.get('/api/search/recent-tournaments'),
          axios.get('/api/search/top-players'),
          axios.get('/api/search/popular-clubs')
        ]);

        if (tournamentsRes.data.success) setRecentTournaments(tournamentsRes.data.tournaments);
        if (playersRes.data.success) setTopPlayers(playersRes.data.players);
        if (clubsRes.data.success) setPopularClubs(clubsRes.data.clubs);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Handle search
  useEffect(() => {
    debouncedSearch(query, filters);
    debouncedSuggestions(query);
  }, [query, filters, debouncedSearch, debouncedSuggestions]);

  // Update URL when search changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.format) params.set('format', filters.format);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.minPlayers) params.set('minPlayers', filters.minPlayers.toString());
    if (filters.maxPlayers) params.set('maxPlayers', filters.maxPlayers.toString());
    if (filters.location) params.set('location', filters.location);
    if (filters.tournamentType) params.set('tournamentType', filters.tournamentType);

    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(newUrl);
  }, [query, filters, router]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setShowSuggestions(false);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
      tournamentType: undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'active': return 'badge-info';
      case 'finished': return 'badge-success';
      case 'group-stage': return 'badge-primary';
      case 'knockout': return 'badge-secondary';
      default: return 'badge-neutral';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Várakozik';
      case 'active': return 'Aktív';
      case 'finished': return 'Befejezve';
      case 'group-stage': return 'Csoportkör';
      case 'knockout': return 'Egyenes kiesés';
      default: return status;
    }
  };

  const getFormatText = (format: string) => {
    switch (format) {
      case 'group': return 'Csoport';
      case 'knockout': return 'Egyenes kiesés';
      case 'group_knockout': return 'Csoport + Kiesés';
      default: return format;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Keresés</h1>
          <p className="text-base-content/70 text-lg">
            Keress játékosokat, tornákat és klubbokat
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Mit keresel?"
                  className="input input-lg input-bordered w-full pr-12"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <span className="loading loading-spinner loading-sm"></span>
                  </div>
                )}
              </div>
              <button
                className="btn btn-lg btn-primary"
                onClick={() => debouncedSearch(query, filters)}
              >
                Keresés
              </button>
            </div>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 mt-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-3 hover:bg-base-200 transition-colors"
                    onClick={() => handleSearch(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex justify-between items-center mt-4">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              Szűrők {showFilters ? 'elrejtése' : 'megjelenítése'}
            </button>
            
            {(filters.type !== 'all' || filters.status || filters.format || filters.dateFrom || filters.dateTo || filters.minPlayers || filters.maxPlayers || filters.location || filters.tournamentType) && (
              <button
                className="btn btn-ghost btn-sm text-error"
                onClick={clearFilters}
              >
                Szűrők törlése
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4">Szűrők</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Type Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Típus</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <option value="all">Mind</option>
                      <option value="players">Játékosok</option>
                      <option value="tournaments">Tornák</option>
                      <option value="clubs">Klubbok</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Státusz</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={filters.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    >
                      <option value="">Mind</option>
                      <option value="pending">Várakozik</option>
                      <option value="active">Aktív</option>
                      <option value="finished">Befejezve</option>
                      <option value="group-stage">Csoportkör</option>
                      <option value="knockout">Egyenes kiesés</option>
                    </select>
                  </div>

                  {/* Format Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Formátum</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={filters.format || ''}
                      onChange={(e) => handleFilterChange('format', e.target.value || undefined)}
                    >
                      <option value="">Mind</option>
                      <option value="group">Csoport</option>
                      <option value="knockout">Egyenes kiesés</option>
                      <option value="group_knockout">Csoport + Kiesés</option>
                    </select>
                  </div>

                  {/* Tournament Type Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Típus</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={filters.tournamentType || ''}
                      onChange={(e) => handleFilterChange('tournamentType', e.target.value || undefined)}
                    >
                      <option value="">Mind</option>
                      <option value="amateur">Amatőr</option>
                      <option value="open">Open</option>
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Helyszín</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Város..."
                      className="input input-bordered"
                      value={filters.location || ''}
                      onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                    />
                  </div>

                  {/* Date Range */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Dátumtól</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={filters.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Dátumig</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={filters.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                    />
                  </div>

                  {/* Player Count Range */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Min. játékosok</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="input input-bordered"
                      value={filters.minPlayers || ''}
                      onChange={(e) => handleFilterChange('minPlayers', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-bold">Max. játékosok</span>
                    </label>
                    <input
                      type="number"
                      placeholder="100"
                      className="input input-bordered"
                      value={filters.maxPlayers || ''}
                      onChange={(e) => handleFilterChange('maxPlayers', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {query && (
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                {/* Results Summary */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    Keresési eredmények: &quot;{query}&quot;
                  </h2>
                  <p className="text-base-content/70">
                    {results.totalResults} találat
                  </p>
                </div>

                {/* Players Results */}
                {results.players && results.players.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Játékosok ({results.players.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.players.map((player) => (
                        <div key={player._id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                          <div className="card-body">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="card-title text-lg">{player.name}</h4>
                              {player.isRegistered && (
                                <span className="badge badge-primary badge-sm">Regisztrált</span>
                              )}
                            </div>
                            <div className="text-sm text-base-content/70 space-y-1">
                              <p>Tornák: {player.statistics?.tournamentsPlayed || 0}</p>
                              <p>Legjobb helyezés: {player.statistics?.bestPosition || 'N/A'}</p>
                              <p>180-ak: {player.statistics?.total180s || 0}</p>
                              <p>Legmagasabb checkout: {player.statistics?.highestCheckout || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tournaments Results */}
                {results.tournaments && results.tournaments.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Tornák ({results.tournaments.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.tournaments.map((tournament) => (
                        <Link key={tournament._id} href={`/tournaments/${tournament.tournamentId}`}>
                          <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                            <div className="card-body">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="card-title text-lg">{tournament.name}</h4>
                                <span className={`badge ${getStatusColor(tournament.status)}`}>
                                  {getStatusText(tournament.status)}
                                </span>
                              </div>
                              <p className="text-sm text-base-content/70 mb-2">
                                {tournament.description}
                              </p>
                              <div className="text-sm text-base-content/70 space-y-1">
                                <p>Formátum: {getFormatText(tournament.format)}</p>
                                <p>Játékosok: {tournament.currentPlayers}/{tournament.maxPlayers}</p>
                                <p>Klub: {tournament.club?.name}</p>
                                {tournament.location && (
                                  <p>Helyszín: {tournament.location}</p>
                                )}
                                
                                <p>Névezési díj: {tournament.entryFee}</p>
                                <p>Táblák: {tournament.boardCount}</p>
                                {tournament.type && (
                                  <p>Típus: {tournament.type === 'amateur' ? 'Amatőr' : 'Open'}</p>
                                )}
                                {(() => {
                                  const now = new Date();
                                  const registrationDeadline = tournament.registrationDeadline ? new Date(tournament.registrationDeadline) : null;
                                  const isRegistrationClosed =
                                    (registrationDeadline !== null && registrationDeadline < now) ||
                                    tournament.status !== 'pending';

                                  console.log(isRegistrationClosed, registrationDeadline, now, tournament.status);

                                  let badgeText = '';
                                  let badgeClass = '';

                                  if (isRegistrationClosed) {
                                    badgeText = 'Zárva';
                                    badgeClass = 'badge-error';
                                  } else if (registrationDeadline && registrationDeadline > now) {
                                    badgeText = 'Határidő';
                                    badgeClass = 'badge-warning';
                                  } else {
                                    badgeText = 'Nyitva';
                                    badgeClass = 'badge-success';
                                  }

                                  return (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className={`badge badge-sm ${badgeClass}`}>
                                        {badgeText}
                                      </span>
                                      {tournament.startDate && (
                                        <p className="text-xs">Dátum: {new Date(tournament.startDate).toLocaleDateString('hu-HU')}</p>
                                      )}
                                      {tournament.registrationDeadline && (
                                        <p className="text-xs">Határidő: {new Date(tournament.registrationDeadline).toLocaleDateString('hu-HU')}</p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clubs Results */}
                {results.clubs && results.clubs.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Klubbok ({results.clubs.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.clubs.map((club) => (
                        <Link key={club._id} href={`/clubs/${club._id}`}>
                          <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                            <div className="card-body">
                              <h4 className="card-title text-lg">{club.name}</h4>
                              <p className="text-sm text-base-content/70 mb-2">
                                {club.description}
                              </p>
                              <div className="text-sm text-base-content/70 space-y-1">
                                <p>Helyszín: {club.location}</p>
                                <p>Tagok: {club.memberCount}</p>
                                <p>Módosítók: {club.moderatorCount}</p>
                                <p>Táblák: {club.boardCount}</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {results.totalResults === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold mb-2">Nincs találat</h3>
                    <p className="text-base-content/70">
                      Próbáld meg másik keresési kifejezést vagy módosítsd a szűrőket.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Initial Content */}
        {!query && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Tournaments */}
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title mb-4">Legutóbbi Tornák</h3>
                  {recentTournaments.length > 0 ? (
                    <div className="space-y-3">
                      {recentTournaments.map((tournament) => (
                        <Link key={tournament._id} href={`/tournaments/${tournament.tournamentId}`}>
                          <div className="p-3 rounded-lg hover:bg-base-200 transition-colors cursor-pointer">
                            <h4 className="font-semibold">{tournament.tournamentSettings?.name}</h4>
                            <div className="text-sm text-base-content/70 space-y-1">
                              <p>{tournament.clubId?.name} • {new Date(tournament.tournamentSettings?.startDate).toLocaleDateString('hu-HU')}</p>
                              {tournament.tournamentSettings?.location && (
                                <p>📍 {tournament.tournamentSettings.location}</p>
                              )}
                              {tournament.tournamentSettings?.type && (
                                <p>🏆 {tournament.tournamentSettings.type === 'amateur' ? 'Amatőr' : 'Open'}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {(() => {
                                  const now = new Date();
                                  const registrationDeadline = tournament.tournamentSettings?.registrationDeadline ? new Date(tournament.tournamentSettings.registrationDeadline) : null;
                                  const isRegistrationClosed = 
                                    (registrationDeadline !== null && registrationDeadline < now) ||
                                    tournament.tournamentSettings?.status !== 'pending';
                                  
                                  return (
                                    <span className={`badge badge-xs ${isRegistrationClosed ? 'badge-error' : 'badge-success'}`}>
                                      {isRegistrationClosed ? 'Zárva' : 'Nyitva'}
                                    </span>
                                  );
                                })()}
                                <span className="text-xs">
                                  {tournament.tournamentPlayers?.length || 0}/{tournament.tournamentSettings?.maxPlayers} játékos
                                </span>
                                {tournament.tournamentSettings?.registrationDeadline && (
                                  <span className="text-xs">
                                    Határidő: {new Date(tournament.tournamentSettings.registrationDeadline).toLocaleDateString('hu-HU')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base-content/70">Nincsenek tornák</p>
                  )}
                </div>
              </div>

              {/* Top Players */}
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title mb-4">Top Játékosok</h3>
                  {topPlayers.length > 0 ? (
                    <div className="space-y-3">
                      {topPlayers.map((player, index) => (
                        <div key={player._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary">#{index + 1}</span>
                            <div>
                              <h4 className="font-semibold">{player.name}</h4>
                              <p className="text-sm text-base-content/70">
                                {player.statistics?.bestPosition || 'N/A'}. helyezés átlag
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base-content/70">Nincsenek játékosok</p>
                  )}
                </div>
              </div>

              {/* Popular Clubs */}
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title mb-4">Népszerű Klubbok</h3>
                  {popularClubs.length > 0 ? (
                    <div className="space-y-3">
                      {popularClubs.map((club, index) => (
                        <Link key={club._id} href={`/clubs/${club._id}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">#{index + 1}</span>
                              <div>
                                <h4 className="font-semibold">{club.name}</h4>
                                <p className="text-sm text-base-content/70">
                                  {club.memberCount} tag
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base-content/70">Nincsenek klubbok</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Debounce utility function
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
