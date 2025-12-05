"use client"

import * as React from "react"
import { IconTrophy, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import TournamentList from "./TournamentList"

interface ClubTournamentsSectionProps {
  tournaments: any[]
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  isVerified?: boolean
  onCreateTournament: () => void
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <IconTrophy className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Versenyek</h2>
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
          <Button onClick={onCreateTournament} size="sm" className="text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-6">
            <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="hidden xs:inline">Új verseny</span>
            <span className="xs:hidden">Új</span>
          </Button>
        </div>
      )}
      </div>

      <TournamentList
        tournaments={tournaments}
        userRole={userRole}
        onDeleteTournament={onDeleteTournament}
      />
    </div>
  )
}

export default ClubTournamentsSection

