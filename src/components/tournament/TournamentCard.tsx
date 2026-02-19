import { Link } from '@/i18n/routing'
import {
  IconTrophy,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconCoin,
  IconDotsVertical,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconShieldCheck,
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
import { useTranslations } from 'next-intl'

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
      _id: string
      name: string
      verified?: boolean
    } | string
    league?: string
    isVerified?: boolean
    verified?: boolean
    isOac?: boolean
    city?: string
  }
  userRole?: 'admin' | 'moderator' | 'member' | 'none'
  showActions?: boolean
  onDelete?: () => void
  onEdit?: () => void
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  'group-stage': 'bg-info/10 text-info border-info/20',
  knockout: 'bg-primary/10 text-primary border-primary/20',
  finished: 'bg-success/10 text-success border-success/20',
}

export default function TournamentCard({
  tournament,
  userRole = 'none',
  onDelete,
  onEdit,
}: TournamentCardProps) {
  const t = useTranslations('Tournament.card')

  const statusLabels: Record<string, string> = {
    pending: t('status.pending'),
    'group-stage': t('status.group_stage'),
    knockout: t('status.knockout'),
    finished: t('status.finished'),
  }

  const typeLabels: Record<string, string> = {
    amateur: t('type.amateur'),
    open: t('type.open'),
  }

  const status = tournament.tournamentSettings?.status || 'pending'
  const playerCount = tournament.tournamentPlayers?.length || 0
  const maxPlayers = tournament.tournamentSettings?.maxPlayers || 0
  const isFull = maxPlayers > 0 && playerCount >= maxPlayers
  const entryFee = tournament.tournamentSettings?.entryFee || 0
  const tournamentId = tournament.tournamentId || tournament._id

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[role="menu"]') || target.closest('[data-radix-popper-content-wrapper]')) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const getDetailsLink = () => {
    return `/tournaments/${tournamentId}`
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    action()
  }

  return (
    <Link href={getDetailsLink()} className="block h-full" onClick={handleCardClick}>
      <Card className="h-full border-0 bg-card/60 backdrop-blur-sm shadow-xl flex flex-col transition-all hover:shadow-2xl hover:bg-card/70 hover:scale-[1.02] cursor-pointer">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconTrophy className="w-4 h-4 text-primary" />
              <span className="truncate">
                {typeof tournament.clubId === 'object' && tournament.clubId?.name
                  ? tournament.clubId.name
                  : tournament.verified ? '' : t('tournament_details')}
              </span>
              {(tournament.verified) && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 flex items-center gap-1">
                  <IconShieldCheck className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('verified')}</span>
                </Badge>
              )}

            </div>
            <h3 className="text-lg font-semibold text-foreground leading-tight line-clamp-2">
              {tournament.tournamentSettings?.name}
            </h3>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge
              variant="outline"
              className={cn('border px-2 py-1 text-xs font-medium', statusStyles[status])}
            >
              {statusLabels[status]}
            </Badge>

            {(userRole === 'admin' || userRole === 'moderator') && (onDelete || onEdit) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-8 sm:w-8 md:h-9 md:w-9"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDotsVertical className="w-5 h-5 sm:w-4 sm:h-4 md:w-4 md:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => handleActionClick(e, onEdit)}
                      className="flex items-center gap-2"
                    >
                      <IconEdit className="w-4 h-4 flex-shrink-0" />
                      <span>{t('edit')}</span>
                    </DropdownMenuItem>
                  )}
                  {onDelete && !(tournament.verified || tournament.isVerified) && (
                    <DropdownMenuItem
                      onClick={(e) => handleActionClick(e, onDelete)}
                      className="flex items-center gap-2 text-destructive focus:text-destructive"
                    >
                      <IconTrash className="w-4 h-4 flex-shrink-0" />
                      <span>{t('delete')}</span>
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
            <IconCalendar className="w-4 h-4 text-info" />
            <span>
              {new Date(tournament.tournamentSettings.startDate).toLocaleDateString('hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}

        {tournament.tournamentSettings?.location && (
          <div className="flex items-center gap-2">
            <IconMapPin className="w-4 h-4 text-accent" />
            <span className="truncate">
              {tournament.city || tournament.tournamentSettings.location}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <IconUsers className="w-4 h-4 text-success" />
          <span>
            {playerCount} / {maxPlayers || '∞'} {t('players')}
            {isFull && <span className="ml-1 text-xs text-warning">({t('full')})</span>}
          </span>
        </div>

        {entryFee > 0 && (
          <div className="flex items-center gap-2">
            <IconCoin className="w-4 h-4 text-warning" />
            <span>{t('entry_fee')}: {entryFee} Ft</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between pt-4">
        <div className="text-[10px] text-muted-foreground opacity-60">
          ID: {tournament.tournamentId}
        </div>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/10 hover:text-primary transition-all">
          {t('details')}
          <IconChevronRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
    </Link>
  )
}