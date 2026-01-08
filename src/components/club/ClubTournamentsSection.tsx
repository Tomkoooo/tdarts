"use client"

import * as React from "react"
import { IconTrophy, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import TournamentList from "./TournamentList"

interface ClubTournamentsSectionProps {
  tournaments: any[]
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  isVerified?: boolean
  onCreateTournament: (isSandbox: boolean) => void
  onCreateOacTournament?: () => void
  onDeleteTournament?: (tournamentId: string) => void
}

export function ClubTournamentsSection({
  tournaments,
  userRole,
  isVerified = false,
  onCreateTournament,
  onCreateOacTournament,
  onDeleteTournament,
}: ClubTournamentsSectionProps) {
  const [viewMode, setViewMode] = React.useState<'active' | 'sandbox' | 'deleted'>('active')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [verificationFilter, setVerificationFilter] = React.useState<string>('all')

  // Filter tournaments
  const filteredTournaments = React.useMemo(() => {
    return tournaments.filter(t => {
      const isDeleted = t.isDeleted === true;
      const isSandbox = t.isSandbox === true;
      const verified = t.verified === true || t.isVerified === true;
      const status = t.tournamentSettings?.status || 'pending';

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
      
      return true;
    })
  }, [tournaments, viewMode, statusFilter, verificationFilter])

  // Group tournaments by date (Newest first)
  const groupedTournaments = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    
    // Sort all tournaments by date DESC (newest at the top)
    const sorted = [...filteredTournaments].sort((a, b) => 
      new Date(b.tournamentSettings.startDate).getTime() - 
      new Date(a.tournamentSettings.startDate).getTime()
    )

    sorted.forEach(tournament => {
      const date = new Date(tournament.tournamentSettings.startDate)
      const dateKey = date.toDateString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(tournament)
    })
      
    return groups
  }, [filteredTournaments])

  const sortedDateKeys = React.useMemo(() => {
    return Object.keys(groupedTournaments).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )
  }, [groupedTournaments])

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday = date.getTime() === today.getTime()

    if (isToday) return 'Ma'
    
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between md:flex-row flex-col gap-3 items-start">
        <div className="flex flex-col items-center gap-3 md:flex-row ">
          <div className="flex items-center gap-3 ">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <IconTrophy className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">Versenyek</h2>
          </div>
          {/* Sandbox Toggle */}
          {/* Sandbox Toggle - Only visible to admins/moderators */}
          {(userRole === 'admin' || userRole === 'moderator') && (
            <div className="flex flex-wrap items-center gap-1 ml-6 bg-muted/30 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('active')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'active'
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                Éles
              </button>
              <button
                onClick={() => setViewMode('sandbox')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'sandbox'
                    ? 'bg-warning/10 text-warning shadow-sm ring-1 ring-warning/20' 
                    : 'text-muted-foreground hover:text-warning/80'
                }`}
              >
                Teszt
              </button>
              <button
                onClick={() => setViewMode('deleted')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  viewMode === 'deleted'
                    ? 'bg-destructive/10 text-destructive shadow-sm ring-1 ring-destructive/20' 
                    : 'text-muted-foreground hover:text-destructive/80'
                }`}
              >
                Törölt
              </button>
            </div>
          )}
        </div>

      {(userRole === 'admin' || userRole === 'moderator') && (
        <div className="flex gap-2">
          {isVerified && onCreateOacTournament && viewMode === 'active' && (
            <Button 
              onClick={onCreateOacTournament} 
              size="sm" 
              variant="outline"
              className="text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-6 border-warning text-warning hover:bg-warning/10"
            >
              <IconTrophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">Új OAC Verseny</span>
              <span className="xs:hidden">Új OAC verseny</span>
            </Button>
          )}
          <Button onClick={() => onCreateTournament(viewMode === 'sandbox')} size="sm" className="text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-6">
            <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="hidden xs:inline">{viewMode === 'sandbox' ? "Új teszt verseny" : "Új verseny"}</span>
            <span className="xs:hidden">{viewMode === 'sandbox' ? "Új teszt verseny" : "Új verseny"}</span>
          </Button>
        </div>
      )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:flex sm:items-end flex-wrap gap-4 bg-card/40 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Állapot</label>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="all">Összes állapot</option>
            <option value="pending">Várakozó</option>
            <option value="group-stage">Csoportkör</option>
            <option value="knockout">Kieséses</option>
            <option value="finished">Befejezett</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Hitelesítés</label>
          <select 
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="all">Összes típus</option>
            <option value="verified">Hitelesített (OAC)</option>
            <option value="unverified">Nem hitelesített</option>
          </select>
        </div>

        {(statusFilter !== 'all' || verificationFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setStatusFilter('all');
              setVerificationFilter('all');
            }}
            className="text-xs h-9"
          >
            Szűrők törlése
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
                  {groupedTournaments[dateKey].length} verseny
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

