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
  const [showSandbox, setShowSandbox] = React.useState(false)

  // Filter tournaments
  const filteredTournaments = React.useMemo(() => {
    return tournaments.filter(t => {
      // If showSandbox is true, show ONLY sandbox tournaments
      // If showSandbox is false, show ONLY non-sandbox tournaments
      const isSandboxNodes = t.isSandbox === true;
      return showSandbox ? isSandboxNodes : !isSandboxNodes;
    })
  }, [tournaments, showSandbox])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-col md:flex-row ">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <IconTrophy className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Versenyek</h2>
          {/* Sandbox Toggle */}
          {/* Sandbox Toggle - Only visible to admins/moderators */}
          {(userRole === 'admin' || userRole === 'moderator') && (
            <div className="flex items-center gap-1 ml-6 bg-muted/30 p-1 rounded-lg">
              <button
                onClick={() => setShowSandbox(false)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !showSandbox 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                Éles versenyek
              </button>
              <button
                onClick={() => setShowSandbox(true)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  showSandbox 
                    ? 'bg-warning/10 text-warning shadow-sm ring-1 ring-warning/20' 
                    : 'text-muted-foreground hover:text-warning/80'
                }`}
              >
                Teszt versenyek
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
              <span className="hidden xs:inline">OAC Verseny</span>
              <span className="xs:hidden">OAC</span>
            </Button>
          )}
          <Button onClick={() => onCreateTournament(showSandbox)} size="sm" className="text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-6">
            <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="hidden xs:inline">{showSandbox ? "Teszt verseny" : "Új verseny"}</span>
            <span className="xs:hidden">{showSandbox ? "Teszt" : "Új"}</span>
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

