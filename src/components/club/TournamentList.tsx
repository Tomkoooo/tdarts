import { IconTrophy } from '@tabler/icons-react'
import ClubTournamentCard from '@/components/club/ClubTournamentCard'
import { Card, CardContent } from "@/components/ui/Card"

interface TournamentListProps {
  tournaments: Array<{
    _id: string
    tournamentId: string
    tournamentSettings: {
      name: string
      startDate: string
      location?: string
      type?: 'amateur' | 'open'
      entryFee?: number
      maxPlayers?: number
      registrationDeadline?: string
      status: 'pending' | 'group-stage' | 'knockout' | 'finished'
    }
    tournamentPlayers?: Array<any>
    clubId?: {
      name: string
    }
    isSandbox?: boolean
  }>
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  onDeleteTournament?: (tournamentId: string) => void
  onEditTournament?: (tournamentId: string) => void
}

export default function TournamentList({
  tournaments,
  userRole,
  onDeleteTournament,
  onEditTournament,
}: TournamentListProps) {
  if (!tournaments.length) {
    return (
      <Card className="border-dashed border-muted bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground space-y-3">
          <IconTrophy className="w-10 h-10 mx-auto" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">Még nincsenek tornák.</p>
            <p className="text-sm text-muted-foreground/80">
              Hozz létre egy új eseményt, hogy megkezdődhessen a játék.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {tournaments.map((tournament) => (
        <ClubTournamentCard
          key={tournament._id}
          tournament={tournament}
          userRole={userRole}
          onDelete={
            onDeleteTournament
              ? () => onDeleteTournament(tournament.tournamentId)
              : undefined
          }
          onEdit={onEditTournament ? () => onEditTournament(tournament.tournamentId) : undefined}
        />
      ))}
    </div>
  )
}