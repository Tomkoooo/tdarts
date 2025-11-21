import Link from 'next/link'
import {
  IconTrophy,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconCoin,
  IconChevronRight,
  IconEdit,
  IconTrash
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ClubTournamentCardProps {
  tournament: {
    _id: string
    tournamentId?: string
    tournamentSettings?: {
      name?: string
      startDate?: string
      location?: string
      type?: 'amateur' | 'open'
      entryFee?: number
      maxPlayers?: number
      registrationDeadline?: string
      status?: 'pending' | 'group-stage' | 'knockout' | 'finished' | string
    }
    name?: string
    startDate?: string
    tournamentPlayers?: Array<any>
    clubId?: {
      name: string
    } | string
  }
  userRole?: 'admin' | 'moderator' | 'member' | 'none'
  onDelete?: () => void
  onEdit?: () => void
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  'group-stage': 'bg-info/10 text-info border-info/20',
  knockout: 'bg-primary/10 text-primary border-primary/20',
  finished: 'bg-success/10 text-success border-success/20',
}

const statusLabels: Record<string, string> = {
  pending: 'Várakozó',
  'group-stage': 'Csoportkör',
  knockout: 'Kieséses',
  finished: 'Befejezett',
}

const typeLabels: Record<string, string> = {
  amateur: 'Amatőr',
  open: 'Open',
}

export default function ClubTournamentCard({
  tournament,
  userRole = 'none',
  onDelete,
  onEdit,
}: ClubTournamentCardProps) {
  const status = tournament.tournamentSettings?.status || 'pending'
  const playerCount = tournament.tournamentPlayers?.length || 0
  const maxPlayers = tournament.tournamentSettings?.maxPlayers || 0
  const isFull = maxPlayers > 0 && playerCount >= maxPlayers
  const entryFee = tournament.tournamentSettings?.entryFee || 0
  const tournamentId = tournament.tournamentId || tournament._id
  const canManage = (userRole === 'admin' || userRole === 'moderator') && (onDelete || onEdit)

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    action()
  }

  return (
    <Link href={`/tournaments/${tournamentId}`} className="block h-full">
      <Card className="h-full border-0 bg-card/60 backdrop-blur-sm shadow-xl flex flex-col transition-all hover:shadow-2xl hover:bg-card/70 hover:scale-[1.02] cursor-pointer relative group">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconTrophy className="w-4 h-4 text-primary" />
                <span className="truncate">
                  {typeof tournament.clubId === 'object' && tournament.clubId?.name 
                    ? tournament.clubId.name 
                    : 'Torna részletei'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground leading-tight line-clamp-2">
                {tournament.tournamentSettings?.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('border px-2 py-1 text-xs font-medium', statusStyles[status])}
              >
                {statusLabels[status]}
              </Badge>
            </div>
            <div className="w-6">

            </div>
          </div>

          {tournament.tournamentSettings?.type && (
            <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">
              {typeLabels[tournament.tournamentSettings.type]}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {tournament.tournamentSettings?.startDate && (
            <div className="flex items-center gap-2">
              <IconCalendar className="w-4 h-4 text-info" />
              <span>
                {new Date(tournament.tournamentSettings.startDate).toLocaleDateString('hu-HU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {tournament.tournamentSettings?.location && (
            <div className="flex items-center gap-2">
              <IconMapPin className="w-4 h-4 text-accent" />
              <span className="truncate">{tournament.tournamentSettings.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <IconUsers className="w-4 h-4 text-success" />
            <span>
              {playerCount} / {maxPlayers || '∞'} játékos
              {isFull && <span className="ml-1 text-xs text-warning">(Betelt)</span>}
            </span>
          </div>

          {entryFee > 0 && (
            <div className="flex items-center gap-2">
              <IconCoin className="w-4 h-4 text-warning" />
              <span>Nevezési díj: {entryFee} Ft</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between pt-4">
          <div className="text-xs text-muted-foreground">
            ID: {tournament.tournamentId}
          </div>
          <Button variant="ghost" size="sm" className="gap-2 hover:bg-primary/10 hover:text-primary transition-all">
            Részletek
            <IconChevronRight className="w-4 h-4" />
          </Button>
        </CardFooter>

        {/* Action buttons - only visible on hover and for admins/moderators */}
        {canManage && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className=" bg-background/90 backdrop-blur-sm hover:bg-background"
                onClick={(e) => handleActionClick(e, onEdit)}
                title="Szerkesztés"
              >
                <IconEdit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && status === 'pending' && (
              <Button
                variant="ghost"
                size="icon"
                className=" bg-background/90 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => handleActionClick(e, onDelete)}
                title="Törlés"
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </Card>
    </Link>
  )
}

