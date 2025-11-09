"use client"

import * as React from "react"
import { IconTrophy, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import TournamentList from "./TournamentList"

interface ClubTournamentsSectionProps {
  tournaments: any[]
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  onCreateTournament: () => void
}

export function ClubTournamentsSection({
  tournaments,
  userRole,
  onCreateTournament,
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
          <Button onClick={onCreateTournament}>
            <IconPlus className="w-4 h-4 mr-2" />
            Új verseny
          </Button>
        )}
      </div>

      <TournamentList
        tournaments={tournaments}
        userRole={userRole}
      />
    </div>
  )
}

export default ClubTournamentsSection

