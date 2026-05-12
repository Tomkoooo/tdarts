import { useTranslations } from "next-intl";
import { IconTrophy } from '@tabler/icons-react'
import ClubTournamentCard from '@/components/club/ClubTournamentCard'
import { Card, CardContent } from "@/components/ui/Card"
import { AdSlotContainer } from "@/features/ads/components/AdSlotContainer"

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
      entryFeeCurrency?: string
      maxPlayers?: number
      registrationDeadline?: string
      status: 'pending' | 'group-stage' | 'knockout' | 'finished'
    }
    tournamentPlayers?: Array<any>
    playerCount?: number
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
    const t = useTranslations("Club.components");
  const tournamentsAdInsertIndex =
    tournaments.length > 0
      ? Math.min(Math.max(1, Math.floor(tournaments.length / 2)), tournaments.length - 1)
      : null
  if (!tournaments.length) {
    return (
      <Card className="border-dashed border-border/60 bg-linear-to-br from-card/80 to-card/60 backdrop-blur-xl">
        <CardContent className="py-12 text-center text-muted-foreground space-y-3">
          <IconTrophy className="w-10 h-10 mx-auto" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">{t("még_nincsenek_tornák")}</p>
            <p className="text-sm text-muted-foreground/80">
              {t("hozz_létre_egy")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {tournaments.map((tournament, index) => (
        <div key={tournament._id} className="contents">
          {tournamentsAdInsertIndex !== null && index === tournamentsAdInsertIndex ? (
            <AdSlotContainer
              slotId="club-tournaments-inline-card"
              placementKey="club.tournaments.inline-card"
              viewType="block"
            />
          ) : null}
          <ClubTournamentCard
            tournament={tournament}
            userRole={userRole}
            onDelete={
              onDeleteTournament
                ? () => onDeleteTournament(tournament.tournamentId)
                : undefined
            }
            onEdit={onEditTournament ? () => onEditTournament(tournament.tournamentId) : undefined}
          />
        </div>
      ))}
    </div>
  )
}