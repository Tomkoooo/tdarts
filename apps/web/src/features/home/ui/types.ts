"use client"

export type HomeTournamentType = "amateur" | "open"
export type HomeParticipationMode = "individual" | "pair" | "team"

export interface HomeTournament {
  _id: string
  name: string
  code: string
  date?: string | null
  status?: string
  currentPlayers?: number
  maxPlayers?: number
  entryFee?: number
  /** ISO 4217; defaults to HUF when missing */
  entryFeeCurrency?: string
  /** Amateur vs open */
  tournamentType?: HomeTournamentType
  /** Singles / pairs / teams */
  participationMode?: HomeParticipationMode
  wins?: number
  losses?: number
  legsWon?: number
  legsLost?: number
  nextMatchType?:
    | "playing"
    | "scoring"
    | "pendingPlaying"
    | "pendingScoring"
    | "pendingUnknown"
    | "pending"
    | "unknown"
  nextMatchBoard?: number | null
  /** Opponent display name when the user is a player in the next/ongoing match */
  nextMatchOpponentName?: string | null
}

export interface HomeMetrics {
  matchesPlayed: number
  winRate: number
  tournamentsJoined: number
  currentRanking: number | null
}

export type HomeProfileCompletenessIssue = "photo" | "country" | "terms"

export interface HomeNotifications {
  unreadTickets: number
  reminderCount: number
  spotAvailabilityCount: number
  /** Missing profile photo / country — same items as notification list */
  profileIssueCount: number
}

export interface HomeLeagueStanding {
  leagueId: string
  leagueName: string
  position: number
  totalPoints: number
  tournamentsPlayed: number
  clubName: string
}
