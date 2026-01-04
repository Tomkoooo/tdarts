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

  // Filter tournaments
  const filteredTournaments = React.useMemo(() => {
    return tournaments.filter(t => {
      const isDeleted = t.isDeleted === true;
      const isSandbox = t.isSandbox === true;

      if (viewMode === 'deleted') return isDeleted;
      
      // If we are not in deleted mode, hide deleted tournaments
      if (isDeleted) return false;

      if (viewMode === 'sandbox') return isSandbox;
      if (viewMode === 'active') return !isSandbox;
      
      return !isSandbox && !isDeleted;
    })
  }, [tournaments, viewMode])

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
          {isVerified && onCreateOacTournament && (
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
            <span className="hidden xs:inline">{viewMode === 'sandbox' ? "Teszt verseny" : "Új verseny"}</span>
            <span className="xs:hidden">{viewMode === 'sandbox' ? "Teszt" : "Új verseny"}</span>
          </Button>
        </div>
      )}
      </div>

      <TournamentList
        tournaments={filteredTournaments}
        userRole={userRole}
        onDeleteTournament={onDeleteTournament}
      />
    </div>
  )
}

export default ClubTournamentsSection

