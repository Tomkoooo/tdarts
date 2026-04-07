"use client"

import * as React from "react"
import { IconTrophy, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import TournamentList from "./TournamentList"
import { useLocale, useTranslations } from "next-intl"
import { addDaysToDateKey, formatDateKeyLabel, getLocalDateKey, getUserTimeZone } from "@/lib/date-time"

interface ClubTournamentsSectionProps {
  tournaments: any[]
  preselectedTournamentIds?: string[]
  invalidShareToken?: boolean
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  isVerified?: boolean
  onCreateTournament: (isSandbox: boolean) => void
  onCreateOacTournament?: () => void
  onDeleteTournament?: (tournamentId: string) => void
}

export function ClubTournamentsSection({
  tournaments,
  preselectedTournamentIds = [],
  invalidShareToken = false,
  userRole,
  isVerified = false,
  onCreateTournament,
  onCreateOacTournament,
  onDeleteTournament,
}: ClubTournamentsSectionProps) {
  const t = useTranslations('Club.tournaments')
  const locale = useLocale()
  const timeZone = getUserTimeZone()
  const getAdaptiveDefaults = React.useCallback(() => {
    const todayKey = getLocalDateKey(new Date(), timeZone)
    const hasUpcomingActiveTournament = tournaments.some((tournament) => {
      const isDeleted = tournament.isDeleted === true
      const isSandbox = tournament.isSandbox === true
      if (isDeleted || isSandbox) return false
      const startDateValue = tournament.tournamentSettings?.startDate
        ? new Date(tournament.tournamentSettings.startDate)
        : null
      if (!startDateValue || Number.isNaN(startDateValue.getTime()) || !todayKey) return false
      const tournamentDateKey = getLocalDateKey(startDateValue, timeZone)
      return !!tournamentDateKey && tournamentDateKey >= todayKey
    })

    return hasUpcomingActiveTournament
      ? { timePreset: 'upcoming' as const, sortOrder: 'asc' as const }
      : { timePreset: 'all' as const, sortOrder: 'desc' as const }
  }, [timeZone, tournaments])

  const adaptiveDefaults = React.useMemo(() => getAdaptiveDefaults(), [getAdaptiveDefaults])
  const [viewMode, setViewMode] = React.useState<'active' | 'sandbox' | 'deleted'>('active')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [verificationFilter, setVerificationFilter] = React.useState<string>('all')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(adaptiveDefaults.sortOrder)
  const [timePreset, setTimePreset] = React.useState<'upcoming' | 'next7' | 'next30' | 'onDate' | 'all'>(adaptiveDefaults.timePreset)
  const [selectedDate, setSelectedDate] = React.useState<string>('')
  const [nameQuery, setNameQuery] = React.useState<string>('')
  const [filtersTouched, setFiltersTouched] = React.useState(false)
  const [selectedShareTournamentIds, setSelectedShareTournamentIds] = React.useState<string[]>(preselectedTournamentIds)

  React.useEffect(() => {
    setSelectedShareTournamentIds(preselectedTournamentIds)
  }, [preselectedTournamentIds])

  React.useEffect(() => {
    if (filtersTouched) return
    setTimePreset(adaptiveDefaults.timePreset)
    setSortOrder(adaptiveDefaults.sortOrder)
  }, [adaptiveDefaults.sortOrder, adaptiveDefaults.timePreset, filtersTouched])

  // Filter tournaments
  const filteredTournaments = React.useMemo(() => {
    const query = nameQuery.trim().toLowerCase()
    const todayKey = getLocalDateKey(new Date(), timeZone)
    const next7Key = todayKey ? addDaysToDateKey(todayKey, 7) : null
    const next30Key = todayKey ? addDaysToDateKey(todayKey, 30) : null

    return tournaments.filter((t) => {
      const isDeleted = t.isDeleted === true;
      const isSandbox = t.isSandbox === true;
      const verified = t.verified === true || t.isVerified === true;
      const status = t.tournamentSettings?.status || 'pending';
      const tournamentName = String(t.tournamentSettings?.name || '').toLowerCase()
      const startDateValue = t.tournamentSettings?.startDate ? new Date(t.tournamentSettings.startDate) : null
      const hasValidStartDate = !!startDateValue && !Number.isNaN(startDateValue.getTime())

      // View Mode Filter
      if (viewMode === 'deleted') {
        if (!isDeleted) return false;
      } else if (isDeleted) {
        return false;
      } else if (viewMode === 'sandbox') {
        if (!isSandbox) return false;
      } else if (viewMode === 'active') {
        if (isSandbox) return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      // Verification Filter
      if (verificationFilter === 'verified' && !verified) return false;
      if (verificationFilter === 'unverified' && verified) return false;

      // Name search
      if (query && !tournamentName.includes(query)) return false;

      if (selectedShareTournamentIds.length > 0) {
        const currentTournamentId = String(t.tournamentId || '').trim()
        if (!currentTournamentId || !selectedShareTournamentIds.includes(currentTournamentId)) return false
      }

      // Time filter
      if (timePreset !== 'all') {
        if (!hasValidStartDate || !startDateValue) return false;

        const tournamentDateKey = getLocalDateKey(startDateValue, timeZone)
        if (!tournamentDateKey || !todayKey) return false

        if (timePreset === 'upcoming' && tournamentDateKey < todayKey) return false;
        if (timePreset === 'next7' && (!next7Key || tournamentDateKey < todayKey || tournamentDateKey > next7Key)) return false;
        if (timePreset === 'next30' && (!next30Key || tournamentDateKey < todayKey || tournamentDateKey > next30Key)) return false;
        if (timePreset === 'onDate') {
          if (!selectedDate) return false;
          if (tournamentDateKey !== selectedDate) return false;
        }
      }

      return true;
    })
  }, [
    tournaments,
    viewMode,
    statusFilter,
    verificationFilter,
    nameQuery,
    timePreset,
    selectedDate,
    timeZone,
    selectedShareTournamentIds
  ])

  // Group tournaments by date (Newest first)
  const groupedTournaments = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    
    // Sort all tournaments by date (respecting sortOrder)
    const sorted = [...filteredTournaments].sort((a, b) => {
      const rawA = a.tournamentSettings?.startDate ? new Date(a.tournamentSettings.startDate) : null
      const rawB = b.tournamentSettings?.startDate ? new Date(b.tournamentSettings.startDate) : null
      const timeA = rawA && !Number.isNaN(rawA.getTime()) ? rawA.getTime() : null
      const timeB = rawB && !Number.isNaN(rawB.getTime()) ? rawB.getTime() : null

      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return 1;
      if (timeB === null) return -1;

      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    })

    sorted.forEach(tournament => {
      const date = tournament.tournamentSettings?.startDate ? new Date(tournament.tournamentSettings.startDate) : null
      const dateKey = date && !Number.isNaN(date.getTime()) ? getLocalDateKey(date, timeZone) || '__unknown__' : '__unknown__'
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(tournament)
    })
      
    return groups
  }, [filteredTournaments, sortOrder])

  const sortedDateKeys = React.useMemo(() => {
    return Object.keys(groupedTournaments).sort((a, b) => {
      if (a === '__unknown__' && b === '__unknown__') return 0;
      if (a === '__unknown__') return 1;
      if (b === '__unknown__') return -1;
      return sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
    })
  }, [groupedTournaments, sortOrder])

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === '__unknown__') return t('date_header.unknown')

    const todayKey = getLocalDateKey(new Date(), timeZone)
    const isToday = dateStr === todayKey

    if (isToday) return t('date_header.today')
    
    return formatDateKeyLabel(dateStr, locale)
  }

  return (
    <div className="space-y-6 pb-16 md:pb-4">
      <div className="rounded-3xl border border-border/60 bg-linear-to-br from-card/95 via-card/80 to-card/65 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 md:items-center">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20">
              <IconTrophy className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{t('title')}</h2>
            </div>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/25 p-1">
                <button
                  onClick={() => setViewMode('active')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                    viewMode === 'active'
                      ? 'bg-background text-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground/80'
                  }`}
                >
                  {t('view_mode.active')}
                </button>
                <button
                  onClick={() => setViewMode('sandbox')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                    viewMode === 'sandbox'
                      ? 'bg-warning/12 text-warning ring-1 ring-warning/30'
                      : 'text-muted-foreground hover:text-warning/80'
                  }`}
                >
                  {t('view_mode.sandbox')}
                </button>
                <button
                  onClick={() => setViewMode('deleted')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                    viewMode === 'deleted'
                      ? 'bg-destructive/12 text-destructive ring-1 ring-destructive/30'
                      : 'text-muted-foreground hover:text-destructive/80'
                  }`}
                >
                  {t('view_mode.deleted')}
                </button>
              </div>
            )}
          </div>

          {(userRole === 'admin' || userRole === 'moderator') && (
            <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
              {isVerified && onCreateOacTournament && viewMode === 'active' && (
                <Button
                  onClick={onCreateOacTournament}
                  size="sm"
                  variant="outline"
                  className="h-10 flex-1 min-w-[180px] border-warning text-warning hover:bg-warning/10 md:flex-none"
                >
                  <IconTrophy className="mr-2 h-4 w-4" />
                  {t('new_oac')}
                </Button>
              )}
              <Button
                onClick={() => onCreateTournament(viewMode === 'sandbox')}
                size="sm"
                className="h-10 flex-1 min-w-[180px] md:flex-none"
              >
                <IconPlus className="mr-2 h-4 w-4" />
                {viewMode === 'sandbox' ? t('new_test') : t('new_tournament')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl sm:flex sm:flex-wrap sm:items-end">
        {invalidShareToken && (
          <div className="w-full rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            {t('share_filter.invalid_token')}
          </div>
        )}
        {selectedShareTournamentIds.length > 0 && (
          <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 text-xs">
            <span className="font-medium text-foreground">
              {t('share_filter.active_count', { count: selectedShareTournamentIds.length })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedShareTournamentIds([])}
            >
              {t('share_filter.clear')}
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('filters.status')}</label>
          <select 
            value={statusFilter}
            onChange={(e) => {
              setFiltersTouched(true)
              setStatusFilter(e.target.value)
            }}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="all">{t('status_options.all')}</option>
            <option value="pending">{t('status_options.pending')}</option>
            <option value="group-stage">{t('status_options.group_stage')}</option>
            <option value="knockout">{t('status_options.knockout')}</option>
            <option value="finished">{t('status_options.finished')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('filters.verification')}</label>
          <select 
            value={verificationFilter}
            onChange={(e) => {
              setFiltersTouched(true)
              setVerificationFilter(e.target.value)
            }}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="all">{t('verification_options.all')}</option>
            <option value="verified">{t('verification_options.verified')}</option>
            <option value="unverified">{t('verification_options.unverified')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('filters.sort')}</label>
          <select 
            value={sortOrder}
            onChange={(e) => {
              setFiltersTouched(true)
              setSortOrder(e.target.value as 'asc' | 'desc')
            }}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="desc">{t('sort_options.desc')}</option>
            <option value="asc">{t('sort_options.asc')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('filters.time')}</label>
          <select
            value={timePreset}
            onChange={(e) => {
              setFiltersTouched(true)
              setTimePreset(e.target.value as 'upcoming' | 'next7' | 'next30' | 'onDate' | 'all')
            }}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="upcoming">{t('time_options.upcoming')}</option>
            <option value="next7">{t('time_options.next_7_days')}</option>
            <option value="next30">{t('time_options.next_30_days')}</option>
            <option value="onDate">{t('time_options.on_date')}</option>
            <option value="all">{t('time_options.all')}</option>
          </select>
        </div>

        {timePreset === 'onDate' && (
          <div className="flex flex-col gap-1.5 flex-1 min-w-[170px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('filters.on_date')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setFiltersTouched(true)
                setSelectedDate(e.target.value)
              }}
              className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('filters.search')}</label>
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => {
              setFiltersTouched(true)
              setNameQuery(e.target.value)
            }}
            placeholder={t('search_placeholder')}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        {(statusFilter !== 'all' ||
          verificationFilter !== 'all' ||
          sortOrder !== 'asc' ||
          timePreset !== 'all' ||
          selectedDate !== '' ||
          nameQuery.trim() !== '' ||
          selectedShareTournamentIds.length > 0) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const defaults = getAdaptiveDefaults();
              setFiltersTouched(false);
              setStatusFilter('all');
              setVerificationFilter('all');
              setSortOrder(defaults.sortOrder);
              setTimePreset(defaults.timePreset);
              setSelectedDate('');
              setNameQuery('');
              setSelectedShareTournamentIds([]);
            }}
            className="text-xs h-9"
          >
            {t('filters.clear')}
          </Button>
        )}
      </div>

      <div className="space-y-10">
        {sortedDateKeys.length > 0 ? (
          sortedDateKeys.map(dateKey => (
            <div key={dateKey} className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-primary whitespace-nowrap">
                  {formatDateHeader(dateKey)}
                </h3>
                <div className="flex-1 h-px bg-border/50"></div>
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted/30 px-2 py-1 rounded">
                  {t('tournament_count', { count: groupedTournaments[dateKey].length })}
                </span>
              </div>
              <TournamentList
                tournaments={groupedTournaments[dateKey]}
                userRole={userRole}
                onDeleteTournament={onDeleteTournament}
              />
            </div>
          ))
        ) : (
          <TournamentList
            tournaments={[]}
            userRole={userRole}
            onDeleteTournament={onDeleteTournament}
          />
        )}
      </div>
    </div>
  )
}

export default ClubTournamentsSection

