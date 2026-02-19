import { Link } from '@/i18n/routing'
import {
  IconTrophy,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconCoin,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconShieldCheck,
  IconFileInvoice
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

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
    isSandbox?: boolean
    verified?: boolean
    isVerified?: boolean
    isOac?: boolean
    invoiceId?: string
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

export default function ClubTournamentCard({
  tournament,
  userRole = 'none',
  onDelete,
  onEdit,
}: ClubTournamentCardProps) {
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
                 { tournament.verified ? '' : t('tournament_details')}
                </span>
                {(tournament.verified || tournament.isVerified) && (
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

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('border px-2 py-1 text-xs font-medium', statusStyles[status])}
              >
                {statusLabels[status]}
              </Badge>
              {tournament.isSandbox && (
                <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10">
                  SANDBOX
                </Badge>
              )}
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
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-muted-foreground opacity-60">
              ID: {tournament.tournamentId}
            </div>
            {(userRole === 'admin' || userRole === 'moderator') && tournament.invoiceId && (
              <div className="text-[10px] text-primary flex items-center gap-1 font-medium bg-primary/5 px-1.5 py-0.5 rounded">
                {t('invoice_label')} {tournament.invoiceId}
              </div>
            )}
             {(userRole === 'admin' || userRole === 'moderator') && tournament.invoiceId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 text-xs hover:bg-primary/10 transition-all"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/api/tournaments/${tournament.tournamentId}/invoice`, '_blank');
                }}
              >
                <IconFileInvoice className="w-3.5 h-3.5" />
                {t('invoice')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">

            <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/10 hover:text-primary transition-all">
              {t('details')}
              <IconChevronRight className="w-4 h-4" />
            </Button>
          </div>
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
                title={t('edit')}
              >
                <IconEdit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && status === 'pending' && !(tournament.verified || tournament.isVerified) && (
              <Button
                variant="ghost"
                size="icon"
                className=" bg-background/90 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => handleActionClick(e, onDelete)}
                title={t('delete')}
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
