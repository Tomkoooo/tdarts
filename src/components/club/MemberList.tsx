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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

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
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!userId) return
    const toastId = toast.loading('Tag törlése...')
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeMember`, {
        userId: memberId,
        requesterId: userId,
      })
      onClubUpdated(response.data)
      toast.success(`${memberName} törölve!`, { id: toastId })
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tag törlése sikertelen', { id: toastId })
    }
  }

  const handleAddModerator = async (memberId: string, memberName: string) => {
    if (!userId) return
    const toastId = toast.loading('Moderátor hozzáadása...')
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/addModerator`, {
        userId: memberId,
        requesterId: userId,
      })
      onClubUpdated(response.data)
      toast.success(`${memberName} moderátorrá nevezve!`, { id: toastId })
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Moderátor hozzáadása sikertelen', { id: toastId })
    }
  }

  const handleRemoveModerator = async (memberId: string, memberName: string) => {
    if (!userId) return
    const toastId = toast.loading('Moderátor törlése...')
    try {
      const response = await axios.post<Club>(`/api/clubs/${clubId}/removeModerator`, {
        userId: memberId,
        requesterId: userId,
      })
      onClubUpdated(response.data)
      toast.success(`${memberName} moderátori jogai visszavonva!`, { id: toastId })
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Moderátor törlése sikertelen', { id: toastId })
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
          label: 'Adminisztrátor',
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        }
      case 'moderator':
        return {
          icon: <IconShield className="w-3 h-3" />,
          label: 'Moderátor',
          className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        }
      default:
        return {
          icon: <IconUser className="w-3 h-3" />,
          label: 'Tag',
          className: 'bg-muted text-muted-foreground',
        }
    }
  }

  const canManageMembers = userRole === 'admin' || userRole === 'moderator'

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <Card className="border-dashed border-muted">
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <IconUser className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Nincsenek tagok.</p>
            <p className="text-sm text-muted-foreground/80">
              Adj hozzá játékosokat a klubodhoz, hogy elkezdhesd a közös munkát.
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
              <Card key={member._id} className="border-0 bg-card/60 backdrop-blur-sm shadow-sm">
                <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
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
                        <Badge
                          variant="outline"
                          className={cn('gap-1 border', roleBadge.className)}
                        >
                          {roleBadge.icon}
                          {roleBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {isGuest ? (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            Vendég
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              Regisztrált
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
                      Statisztikák
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
                              Moderátorrá tétel
                            </DropdownMenuItem>
                          )}
                          {canDemote && (
                            <DropdownMenuItem
                              onClick={() => handleRemoveModerator(member._id, member.name)}
                              className="gap-2 text-amber-500 focus:text-amber-500"
                            >
                              <IconShield className="w-4 h-4" />
                              Moderátor jog elvétel
                            </DropdownMenuItem>
                          )}
                          {canRemove && (
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member._id, member.name)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <IconTrash className="w-4 h-4" />
                              Tag törlése
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
          onClose={() => {
            setShowStatsModal(false)
            setSelectedPlayer(null)
          }}
        />
      )}
    </div>
  )
}