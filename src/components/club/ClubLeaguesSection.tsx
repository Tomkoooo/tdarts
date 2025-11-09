"use client"

import * as React from "react"
import { IconMedal } from "@tabler/icons-react"
import LeagueManager from "./LeagueManager"

interface ClubLeaguesSectionProps {
  clubId: string
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  autoOpenLeagueId?: string | null
}

export function ClubLeaguesSection({
  clubId,
  userRole,
  autoOpenLeagueId,
}: ClubLeaguesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <IconMedal className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Ligák</h2>
      </div>

      <LeagueManager
        clubId={clubId}
        userRole={userRole}
        autoOpenLeagueId={autoOpenLeagueId}
      />
    </div>
  )
}

export default ClubLeaguesSection

