import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  IconTrash,
  IconUser,
  IconCrown,
  IconShield,
  IconDotsVertical,
  IconChartBar
} from '@tabler/icons-react'
import { Club } from '@/interface/club.interface'
import PlayerStatsModal from '@/components/player/PlayerStatsModal'
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { showErrorToast } from '@/lib/toastUtils'
import { useTranslations } from 'next-intl'

interface MemberListProps {
  members: {
    _id: string
    role: 'admin' | 'moderator' | 'member'
    userRef?: string
    name: string
    username: string
  }[]
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  userId?: string
  clubId: string
  onClubUpdated: (club: Club) => void
  showActions?: boolean
}

export default function MemberList({
  members,
  userRole,
  userId,
  clubId,
  onClubUpdated,
  showActions = true,
}: MemberListProps) {
  const t = useTranslations('Club.members')
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!userId) return
    const toastId = toast.loading(t('toast.removing'))
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeMember`, {
        userId: memberId,
        requesterId: userId,
      })
      onClubUpdated(response.data)
      toast.success(t('toast.removed', { name: memberName }), { id: toastId })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || t('toast.remove_error'), {
        error: err?.response?.data?.error,
        context: t('toast.remove_context'),
        errorName: t('toast.remove_error'),
      })
    }
  }

  const handleAddModerator = async (memberId: string, memberName: string) => {
    if (!userId) return
    const toastId = toast.loading(t('toast.adding_mod'))
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/addModerator`, {
        userId: memberId,
        requesterId: userId,
      })
      onClubUpdated(response.data)
      toast.success(t('toast.added_mod', { name: memberName }), { id: toastId })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || t('toast.add_mod_error'), {
        error: err?.response?.data?.error,
        context: t('toast.add_mod_context'),
        errorName: t('toast.add_mod_error'),
      })
    }
  }

  const handleRemoveModerator = async (memberId: string, memberName: string) => {
    if (!userId) return
    const toastId = toast.loading(t('toast.removing_mod'))
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeModerator`, {
        userId: memberId,
        requesterId: userId,
      })
      onClubUpdated(response.data)
      toast.success(t('toast.removed_mod', { name: memberName }), { id: toastId })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || t('toast.remove_mod_error'), {
        error: err?.response?.data?.error,
        context: t('toast.remove_mod_context'),
        errorName: t('toast.remove_mod_error'),
      })
    }
  }

  const handleViewStats = (member: any) => {
    setSelectedPlayer(member)
    setShowStatsModal(true)
  }

  const getRoleBadge = (role: 'admin' | 'moderator' | 'member') => {
    switch (role) {
      case 'admin':
        return {
          icon: <IconCrown className="w-3 h-3" />,
          label: t('roles.admin'),
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        }
      case 'moderator':
        return {
          icon: <IconShield className="w-3 h-3" />,
          label: t('roles.moderator'),
          className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        }
      default:
        return {
          icon: <IconUser className="w-3 h-3" />,
          label: t('roles.member'),
          className: 'bg-muted text-muted-foreground',
        }
    }
  }

  const canManageMembers = userRole === 'admin' || userRole === 'moderator'

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <Card className="bg-muted/15">
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <IconUser className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">{t('no_members')}</p>
            <p className="text-sm text-muted-foreground/80">
              {t('add_members_prompt')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {members.map((member) => {
            const isGuest = member.username === 'vendég'
            const isSelf = member._id === userId
            const roleBadge = getRoleBadge(member.role)

            const initials = member.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('') || 'JD'

            const canPromote = userRole === 'admin' && member.role === 'member' && !isGuest
            const canDemote = userRole === 'admin' && member.role === 'moderator'
            const canRemove =
              userRole === 'admin'
                ? !isSelf && member.role !== 'admin'
                : userRole === 'moderator' && member.role === 'member' && !isSelf

            return (
              <Card
                key={member._id}
                className="bg-card/85 shadow-sm shadow-black/20"
              >
                <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {member.name}
                        </h3>
                        <Badge variant="outline" className={cn("gap-1 border-none bg-muted/40", roleBadge.className)}>
                          {roleBadge.icon}
                          {roleBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {isGuest ? (
                          <Badge variant="outline" className="border-none bg-muted/40 text-muted-foreground">
                            {t('guest')}
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="outline" className="border-none bg-emerald-500/10 text-emerald-500">
                              {t('registered')}
                            </Badge>
                            <span>@{member.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStats(member)}
                      className="gap-2"
                    >
                      <IconChartBar className="w-4 h-4" />
                      {t('stats')}
                    </Button>

                    {showActions && canManageMembers && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <IconDotsVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canPromote && (
                            <DropdownMenuItem
                              onClick={() => handleAddModerator(member._id, member.name)}
                              className="gap-2"
                            >
                              <IconShield className="w-4 h-4" />
                              {t('promote_moderator')}
                            </DropdownMenuItem>
                          )}
                          {canDemote && (
                            <DropdownMenuItem
                              onClick={() => handleRemoveModerator(member._id, member.name)}
                              className="gap-2 text-warning focus:text-warning"
                            >
                              <IconShield className="w-4 h-4" />
                              {t('demote_moderator')}
                            </DropdownMenuItem>
                          )}
                          {canRemove && (
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member._id, member.name)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <IconTrash className="w-4 h-4" />
                              {t('remove_member')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showStatsModal && selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          clubId={clubId}
          onClose={() => {
            setShowStatsModal(false)
            setSelectedPlayer(null)
          }}
        />
      )}
    </div>
  )
}