import Link from 'next/link'
import {
  IconTrophy,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconCoin,
  IconDotsVertical,
  IconChevronRight
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface TournamentCardProps {
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
  showActions?: boolean
  onDelete?: () => void
  onEdit?: () => void
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'group-stage': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  knockout: 'bg-primary/10 text-primary border-primary/20',
  finished: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
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

export default function TournamentCard({
  tournament,
  userRole = 'none',
  showActions = false,
  onDelete,
  onEdit,
}: TournamentCardProps) {
  const status = tournament.tournamentSettings?.status || 'pending'
  const playerCount = tournament.tournamentPlayers?.length || 0
  const maxPlayers = tournament.tournamentSettings?.maxPlayers || 0
  const isFull = maxPlayers > 0 && playerCount >= maxPlayers
  const entryFee = tournament.tournamentSettings?.entryFee || 0
  const tournamentId = tournament.tournamentId || tournament._id

  return (
    <Link href={`/tournaments/${tournamentId}`} className="block">
      <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-xl flex flex-col transition-all hover:shadow-2xl hover:bg-card/70 cursor-pointer">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconTrophy className="w-4 h-4" />
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

            {showActions && (userRole === 'admin' || userRole === 'moderator') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <IconDotsVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit} className="gap-2">
                      Szerkesztés
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      Törlés
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            <IconCalendar className="w-4 h-4" />
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
            <IconMapPin className="w-4 h-4" />
            <span className="truncate">{tournament.tournamentSettings.location}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <IconUsers className="w-4 h-4" />
          <span>
            {playerCount} / {maxPlayers || '∞'} játékos
            {isFull && <span className="ml-1 text-xs text-amber-500">(Betelt)</span>}
          </span>
        </div>

        {entryFee > 0 && (
          <div className="flex items-center gap-2">
            <IconCoin className="w-4 h-4" />
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
    </Card>
    </Link>
  )
} 