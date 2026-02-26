"use client"

import React, { useMemo, useState } from "react"
import axios from "axios"
import { Link } from "@/i18n/routing"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import {
  IconCheck,
  IconMail,
  IconTrash,
  IconUsers,
  IconBell,
  IconBellOff,
  IconPlus,
  IconCopyCheck,
  IconMedal,
  IconTrophy,
} from "@tabler/icons-react"
import { toast } from "react-hot-toast"

import PlayerSearch from "@/components/club/PlayerSearch"
import PlayerNotificationModal from "@/components/tournament/PlayerNotificationModal"
import PlayerMatchesModal from "@/components/tournament/PlayerMatchesModal"
import LegsViewModal from "@/components/tournament/LegsViewModal"
import TeamRegistrationModal from "@/components/tournament/TeamRegistrationModal"
import { useUserContext } from "@/hooks/useUser"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { showErrorToast } from "@/lib/toastUtils"
import { SmartAvatar } from "@/components/ui/smart-avatar"

interface TournamentPlayersProps {
  tournament: any
  players: any[]
  userClubRole: 'admin' | 'moderator' | 'member' | 'none'
  userPlayerStatus: 'applied' | 'checked-in' | 'none'
  userPlayerId: string | null
  status: 'pending' | 'active' | 'finished' | 'group-stage' | 'knockout'
  onRefresh?: () => void
}

const getPlayerStatusBadge = (status: string): { label?: string; variant: "default" | "outline" | "secondary" | "destructive" } => {
  const badges: Record<string, { label?: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
    applied: { label: tTour('status.applied'), variant: "secondary" },
    "checked-in": { variant: "default" },
    none: { label: "", variant: "default" },
  }
  return badges[status] || badges.none
}

const TournamentPlayers: React.FC<TournamentPlayersProps> = ({
  tournament,
  players,
  userClubRole,
  userPlayerStatus,
  userPlayerId,
  status,
  onRefresh,
}) => {
  const t = useTranslations("Tournament.components");
  const tTour = useTranslations("Tournament");
  const { user } = useUserContext()
  const [localPlayers, setLocalPlayers] = useState(players)
  const [localUserPlayerStatus, setLocalUserPlayerStatus] = useState(userPlayerStatus)
  const [localUserPlayerId, setLocalUserPlayerId] = useState(userPlayerId)
  const [waitingList, setWaitingList] = useState(tournament?.waitingList || [])
  const [selectedPlayerForMatches, setSelectedPlayerForMatches] = useState<{ id: string; name: string } | null>(null)
  const [showPlayerMatchesModal, setShowPlayerMatchesModal] = useState(false)
  const [notificationModal, setNotificationModal] = useState<{ isOpen: boolean; player: any }>({
    isOpen: false,
    player: null,
  })
  const [legsModal, setLegsModal] = useState<{ isOpen: boolean; match: any }>({ isOpen: false, match: null })
  const [activeTab, setActiveTab] = useState<'registered' | 'waiting'>('registered')
  const [removeConfirm, setRemoveConfirm] = useState<{ isOpen: boolean; playerId?: string; playerName?: string }>({
    isOpen: false,
    playerId: undefined,
    playerName: undefined,
  })
  const [isSubscribedToNotifications, setIsSubscribedToNotifications] = useState(
    tournament?.notificationSubscribers?.some((sub: any) => sub.userRef?.toString() === user?._id?.toString()) || false
  )
  const [isOnWaitingList, setIsOnWaitingList] = useState(() => {
    if (!user?._id) return false
    return (tournament?.waitingList || []).some((p: any) => {
      const playerRef = p.playerReference
      if (!playerRef) return false
      
      // Check individual userRef
      if (playerRef.userRef?.toString() === user._id) return true
      
      // Check team members
      if (playerRef.members && Array.isArray(playerRef.members)) {
        return playerRef.members.some((m: any) => {
          const memberUserRef = m.userRef?._id?.toString() || m.userRef?.toString()
          return memberUserRef === user._id
        })
      }
      return false
    })
  })
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [showTeamRegistrationModal, setShowTeamRegistrationModal] = useState(false)
  const [isModeratorRegistration, setIsModeratorRegistration] = useState(false)

  const code = tournament?.tournamentId
  const participationMode = tournament?.tournamentSettings?.participationMode || 'individual'
  const router = useRouter()

  React.useEffect(() => {
    console.log(tournament)
    if(tournament.tournamentSettings.status === 'finished') {
      // If the tournament is finished, sort by tournament position (ascending)
      setLocalPlayers([...players].sort((a: any, b: any) => {
        const posA = a.tournamentStanding ?? Number.MAX_SAFE_INTEGER
        const posB = b.tournamentStanding ?? Number.MAX_SAFE_INTEGER
        return posA - posB
      }))
    } else {
      // Sort alphabetically by player name when tournament is not finished
      setLocalPlayers([...players].sort((a: any, b: any) => {
        const nameA = (a.playerReference?.name || a.name || '').toLowerCase()
        const nameB = (b.playerReference?.name || b.name || '').toLowerCase()
        return nameA.localeCompare(nameB)
      }))
    }
    setLocalUserPlayerStatus(userPlayerStatus)
    setLocalUserPlayerId(userPlayerId)
    setWaitingList(tournament?.waitingList || [])
    setIsSubscribedToNotifications(
      tournament?.notificationSubscribers?.some((sub: any) => sub.userRef?.toString() === user?._id?.toString()) || false
    )
    setIsOnWaitingList(
      (tournament?.waitingList || []).some((p: any) => {
        const playerRef = p.playerReference
        if (!playerRef) return false
        
        // Check individual userRef
        if (playerRef.userRef?.toString() === user?._id) return true
        
        // Check team members
        if (playerRef.members && Array.isArray(playerRef.members)) {
          return playerRef.members.some((m: any) => {
            const memberUserRef = m.userRef?._id?.toString() || m.userRef?.toString()
            return memberUserRef === user?._id
          })
        }
        return false
      })
    )
  }, [players, userPlayerStatus, userPlayerId, tournament?.waitingList, tournament?.notificationSubscribers, user?._id])

  React.useEffect(() => {
    // Notification subscription check removed - feature not used
  }, [user, tournament?.notificationSubscribers])

  const handleAddPlayer = async (player: any) => {
    if (!code) return
    try {
      const payload: any = {}
      if (player._id && !player.userRef && !player.username) {
        payload.playerId = player._id
      } else {
        if (player.userRef) {
          payload.userRef = player.userRef
          payload.name = player.name
        } else {
          payload.name = player.name
        }
      }

      const response = await axios.post(`/api/tournaments/${code}/players`, payload)
      if (response.data.success) {
        const newPlayer = {
          _id: response.data.playerId,
          playerReference: {
            name: payload.name || player.name,
            _id: player._id,
            userRef: payload.userRef,
          },
          status: 'applied'
        }
        setLocalPlayers([...localPlayers, newPlayer])
        // Update user status locally if it was the current user
        if (payload.userRef === user?._id || (player._id && userPlayerId === player._id)) {
           setLocalUserPlayerStatus('applied')
           setLocalUserPlayerId(newPlayer._id)
        }
        toast.success(tTour('players.successfully_added'))
        if (onRefresh) onRefresh()
        router.refresh()
      }
    } catch (error: any) {
      console.error("Error adding player:", error)
      toast.error(error.response?.data?.error || tTour('players.error_add'))
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!code) return
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId } })
      if (response.data.success) {
        setLocalPlayers((prev) => prev.filter((p) => p.playerReference._id !== playerId))
        toast.success(tTour('players.successfully_removed'))
      } else {
        showErrorToast(tTour('players.error_remove'), {
          error: response.data?.error,
          context: tTour('players.remove_player'),
          errorName: tTour('players.error_remove'),
        })
      }
    } catch (error: any) {
      showErrorToast(tTour('players.error_remove'), {
        error: error?.response?.data?.error,
        context: tTour('players.remove_player'),
        errorName: tTour('players.error_remove'),
      })
    }
  }

  const handleCheckInPlayer = async (playerId: string) => {
    if (!code) return
    try {
      const response = await axios.put(`/api/tournaments/${code}/players`, {
        playerId,
        status: 'checked-in',
      })
      if (response.data.success) {
        setLocalPlayers((prev) =>
          prev.map((p) => (p.playerReference._id === playerId ? { ...p, status: 'checked-in' } : p)),
        )
        toast.success(tTour('players.successfully_checked_in'))
      } else {
        showErrorToast(tTour('players.error_check_in'), {
          error: response.data?.error,
          context: tTour('common.check_in'),
          errorName: tTour('players.error_check_in'),
        })
      }
    } catch (error: any) {
      showErrorToast(tTour('players.error_check_in'), {
        error: error?.response?.data?.error,
        context: tTour('common.check_in'),
        errorName: tTour('players.error_check_in'),
      })
    }
  }

  const handleSelfSignUp = async () => {
    if (!user?._id || !code) return
    try {
      const response = await axios.post(`/api/tournaments/${code}/players`, {
        userRef: user._id,
        name: user.name,
      })
      if (response.data.success) {
        const newPlayer = {
          _id: response.data.playerId,
          playerReference: {
            _id: response.data.playerId,
            name: user.name,
            userRef: user._id,
          },
          status: 'applied',
        }
        setLocalPlayers((prev) => [...prev, newPlayer])
        setLocalUserPlayerStatus('applied')
        setLocalUserPlayerId(response.data.playerId)
        toast.success(tTour('registration.sign_up_success'))
      } else {
        showErrorToast(tTour('registration.error_sign_up'), {
          error: response.data?.error,
          context: tTour('registration.sign_up'),
          errorName: tTour('registration.error_sign_up'),
        })
      }
    } catch (error: any) {
      showErrorToast(tTour('registration.error_sign_up'), {
        error: error?.response?.data?.error,
        context: tTour('registration.sign_up'),
        errorName: tTour('registration.error_sign_up'),
      })
    }
  }

  const handleSelfWithdraw = async () => {
    if (!localUserPlayerId || !code) return
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, {
        data: { playerId: localUserPlayerId },
      })
      if (response.data.success) {
        setLocalPlayers((prev) => prev.filter((p) => p.playerReference._id !== localUserPlayerId))
        setLocalUserPlayerStatus('none')
        setLocalUserPlayerId(null)
        toast.success(tTour('registration.withdraw_success'))
      } else {
        showErrorToast(tTour('registration.error_withdraw'), {
          error: response.data?.error,
          context: tTour('registration.withdraw'),
          errorName: tTour('registration.error_withdraw'),
        })
      }
    } catch (error: any) {
      showErrorToast(tTour('registration.error_withdraw'), {
        error: error?.response?.data?.error,
        context: tTour('registration.withdraw'),
        errorName: tTour('registration.error_withdraw'),
      })
    }
  }

  const handleNotifyPlayer = (player: any) => {
    setNotificationModal({ isOpen: true, player })
  }

  const handleOpenMatches = (player: any) => {
    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString() || player._id?.toString()
    const playerName = player.playerReference?.name || player.name || player._id
    if (playerId && code) {
      setSelectedPlayerForMatches({ id: playerId, name: playerName })
      setShowPlayerMatchesModal(true)
    } else {
      showErrorToast(t("nem_sikerult_megnyitni_a_ms3l"), {
        context: 'Játékos meccs megnyitása',
        errorName: 'Meccsek megnyitása sikertelen',
      })
    }
  }


  const handleRemoveFromWaitingList = async (playerId: string) => {
    if (!code) return
    try {
      const response = await axios.delete(`/api/tournaments/${code}/waitlist`, {
        data: { playerId },
      })
      if (response.data.success) {
        setWaitingList((prev: any[]) => prev.filter((p: any) => p.playerReference._id !== playerId))
        // Check if current user was removed
        if (user && (playerId === localUserPlayerId?.toString() || waitingList.some((p: any) => p.playerReference?._id?.toString() === playerId && p.playerReference?.userRef?.toString() === user._id?.toString()))) {
          setIsOnWaitingList(false)
        }
        toast.success(tTour('waiting_list.unsubscribe_success'))
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Nem sikerült lekerülni a várólistáról.', {
        error: err?.response?.data?.error,
        context: 'Várólista kezelés',
        errorName: 'Várólistáról lekerülés sikertelen',
      })
    }
  }

  const handlePromoteFromWaitingList = async (playerId: string) => {
    if (!code) return
    try {
      const response = await axios.post(`/api/tournaments/${code}/waitlist/promote`, { playerId })
      if (response.data.success) {
        const waitingPlayer = waitingList.find((p: any) => p.playerReference._id === playerId)
        if (waitingPlayer) {
          const newPlayer = {
            _id: playerId,
            playerReference: waitingPlayer.playerReference,
            status: 'applied',
          }
          setLocalPlayers((prev: any[]) => [...prev, newPlayer])
          setWaitingList((prev: any[]) => prev.filter((p: any) => p.playerReference._id !== playerId))
          // Check if current user was promoted
          if (user && (playerId === localUserPlayerId?.toString() || waitingPlayer.playerReference?.userRef?.toString() === user._id?.toString())) {
            setIsOnWaitingList(false)
            setLocalUserPlayerStatus('applied')
            setLocalUserPlayerId(playerId)
          }
          toast.success(tTour('players.successfully_promoted'))
        }
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Nem sikerült áthelyezni a játékost.', {
        error: err?.response?.data?.error,
        context: 'Várólista áthelyezés',
        errorName: 'Áthelyezés sikertelen',
      })
    }
  }


  const handleApproveWaitingPlayer = (waitingPlayer: any) => {
    const playerId = waitingPlayer?.playerReference?._id
    if (playerId) {
      void handlePromoteFromWaitingList(playerId)
    }
  }

  const handleRemoveWaitingPlayer = (waitingPlayer: any) => {
    const playerId = waitingPlayer?.playerReference?._id
    if (playerId) {
      void handleRemoveFromWaitingList(playerId)
    }
  }

  const handleSelfWithdrawFromWaiting = (waitingPlayer: any) => {
    const playerId = waitingPlayer?.playerReference?._id
    if (playerId) {
      void handleRemoveFromWaitingList(playerId)
    }
  }

  const handleSubscribeToWaitlist = async () => {
    if (!user || !code) return
    try {
      const response = await axios.post(`/api/tournaments/${code}/waitlist`, {
        userRef: user._id,
        name: user.name,
      })
      if (response.data.success) {
        const newWaitingPlayer = {
          playerReference: {
            _id: response.data.playerId,
            name: user.name,
            userRef: user._id,
          },
          addedAt: new Date(),
        }
        setWaitingList((prev: any[]) => [...prev, newWaitingPlayer])
        setIsOnWaitingList(true)
        toast.success(tTour('waiting_list.subscribe_success'))
      }
    } catch (error: any) {
      showErrorToast(t("nem_sikerult_feliratkozni_a_dbkc"), {
        error: error?.response?.data?.error,
        context: 'Várólista feliratkozás',
        errorName: 'Várólista feliratkozás sikertelen',
      })
    }
  }

  const handleSubscribeToNotifications = async () => {
    if (!user || !code) return
    setIsSubscribing(true)
    try {
      const response = await axios.post(`/api/tournaments/${code}/notifications`)
      if (response.data.success) {
        setIsSubscribedToNotifications(true)
        toast.success(tTour('notifications.subscribe_success'))
      }
    } catch (error: any) {
      showErrorToast(t("nem_sikerult_feliratkozni_az_6n4g"), {
        error: error?.response?.data?.error,
        context: 'Értesítés feliratkozás',
        errorName: 'Értesítés feliratkozás sikertelen',
      })
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleUnsubscribeFromNotifications = async () => {
    if (!user || !code) return
    setIsSubscribing(true)
    try {
      const response = await axios.delete(`/api/tournaments/${code}/notifications`)
      if (response.data.success) {
        setIsSubscribedToNotifications(false)
        toast.success(tTour('notifications.unsubscribe_success'))
      }
    } catch (error: any) {
      showErrorToast(t("nem_sikerult_leiratkozni_az_hnr8"), {
        error: error?.response?.data?.error,
        context: 'Értesítés leiratkozás',
        errorName: 'Értesítés leiratkozás sikertelen',
      })
    } finally {
      setIsSubscribing(false)
    }
  }

  const maxPlayers = tournament?.tournamentSettings?.maxPlayers || 0
  const currentPlayers = localPlayers.length
  const hasFreeSpots = maxPlayers === 0 || currentPlayers < maxPlayers
  const isPending = tournament?.tournamentSettings?.status === 'pending'

  const now = new Date()
  const registrationDeadline = tournament?.tournamentSettings?.registrationDeadline
  const startDate = tournament?.tournamentSettings?.startDate

  const registrationOpen = useMemo(() => {
    if (!isPending) return false
    if (registrationDeadline) {
      return now < new Date(registrationDeadline)
    }
    if (startDate) {
      return now < new Date(new Date(startDate).getTime() - 60 * 60 * 1000)
    }
    return true
  }, [isPending, registrationDeadline, startDate, now])

  const allowAdminActions = isPending
  const allowPlayerRegistration = registrationOpen

  const handleCopyPlayers = () => {
    try{
      navigator.clipboard.writeText(localPlayers.map((player) => player.playerReference?.name).join('\n'))
      toast.success(tTour('players.successfully_copied'))
    }catch(err){
      console.error(err)
      toast.error(t("nem_sikerult_masolni_a_jh9g"))
    }
    

  }

  const canManagePlayers = userClubRole === 'admin' || userClubRole === 'moderator'

  const renderPlayerActions = (player: any) => {
    const playerId = player.playerReference?._id
    if (!playerId) return null

    const isCheckedIn = player.status === 'checked-in'

    return (
      <div className="flex flex-col items-center gap-2">
        {isCheckedIn ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
            <IconCheck className="h-3.5 w-3.5" />
          </span>
        ) : (
          allowAdminActions && canManagePlayers && (
            <Button
              size="sm"
              variant="success"
              className="gap-1"
              onClick={() => handleCheckInPlayer(playerId)}
            >
              <IconCheck className="h-3 w-3" />
              {t("check_in_qhhd")}</Button>
          )
        )}
        {canManagePlayers && status === "pending" && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="info" onClick={() => handleNotifyPlayer(player)} className="gap-1">
              <IconMail className="h-3 w-3" />
              {tTour('common.message')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setRemoveConfirm({
                  isOpen: true,
                  playerId,
                  playerName: player.playerReference?.name || player.name || 'Játékos',
                })
              }
            >
              <IconTrash className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const registeredContent = (
    <div className="space-y-4">
      {allowAdminActions && (userClubRole === 'admin' || userClubRole === 'moderator') && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">
              {participationMode === 'pair' || participationMode === 'team' 
                ? (participationMode === 'pair' ? tTour('players.add_pair') : tTour('players.add_team'))
                : tTour('players.add_player')}
            </CardTitle>
            <CardDescription>
              {participationMode === 'pair' || participationMode === 'team'
                ? tTour('players.search_prompt_team')
                : tTour('players.search_prompt')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participationMode === 'pair' || participationMode === 'team' ? (
              <Button 
                onClick={() => {
                  setIsModeratorRegistration(true);
                  setShowTeamRegistrationModal(true);
                }} 
                className="w-full gap-2"
              >
                <IconUsers className="h-4 w-4" />
                {participationMode === 'pair' ? tTour('players.add_pair') : tTour('players.add_team')}
              </Button>
            ) : (
              <PlayerSearch
                onPlayerSelected={handleAddPlayer}
                clubId={tournament?.clubId?._id || tournament?.clubId}
                isForTournament
                excludedPlayers={localPlayers}
                excludeGuests={tournament?.verified}
                showAddGuest={!tournament?.verified}
              />
            )}
          </CardContent>
        </Card>
      )}


      {user && (
        <Alert className="border-indigo-500/40 bg-indigo-500/10 text-white/90 shadow-sm shadow-black/30">
          <AlertDescription className="flex flex-col gap-3">
            {isOnWaitingList ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{tTour('waiting_list.on_waiting_list')}</p>
                  <p className="text-xs text-white/70">
                    {tTour('waiting_list.on_waiting_list_subtitle')}
                  </p>
                </div>
                {/* Find the waiting entry ID to allow withdrawal */}
                <Button 
                  size="sm" 
                  variant="warning" 
                  onClick={() => {
                    const waitingEntry = (tournament?.waitingList || []).find((p: any) => {
                      const pr = p.playerReference
                      if (!pr) return false
                      if (pr.userRef?.toString() === user?._id || pr.userRef?._id?.toString() === user?._id) return true
                      if (pr.members?.some((m: any) => (m.userRef?._id?.toString() || m.userRef?.toString()) === user?._id)) return true
                      return false
                    })
                    if (waitingEntry?.playerReference?._id) {
                      handleRemoveFromWaitingList(waitingEntry.playerReference._id)
                    }
                  }}
                >
                  {tTour('waiting_list.unsubscribe')}
                </Button>
              </div>
            ) : localUserPlayerId && localUserPlayerStatus !== 'none' ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{tTour('registration.already_registered')}</p>
                  <p className="text-xs text-white/70">
                    {tTour('registration.already_registered_subtitle')}
                  </p>
                </div>
                {localUserPlayerStatus === 'applied' && (
                  <Button size="sm" variant="warning" onClick={handleSelfWithdraw}>
                    {tTour('registration.withdraw')}
                  </Button>
                )}
              </div>
            ) : null}
            
            <div className={cn(
              "flex items-center gap-2 pt-2",
              (localUserPlayerId && localUserPlayerStatus !== 'none' || isOnWaitingList) ? "border-t border-indigo-500/20" : ""
            )}>
              <Button
                size="sm"
                variant={isSubscribedToNotifications ? "secondary" : "info"}
                onClick={isSubscribedToNotifications ? handleUnsubscribeFromNotifications : handleSubscribeToNotifications}
                className="gap-2"
                disabled={isSubscribing}
              >
                {isSubscribedToNotifications ? (
                  <>
                    <IconBellOff className="h-4 w-4" />
                    {tTour('notifications.unsubscribe')}
                  </>
                ) : (
                  <>
                    <IconBell className="h-4 w-4" />
                    {tTour('notifications.subscribe')}
                  </>
                )}
              </Button>
              <p className="text-xs text-white/70">
                {isSubscribedToNotifications 
                  ? "Email értesítést kapsz a felszabaduló helyekről."
                  : "Iratkozz fel a felszabaduló helyek értesítéseire!"}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {allowPlayerRegistration && localUserPlayerStatus === 'none' && !isOnWaitingList && !tournament?.isSandbox && (
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
          participationMode === 'pair' || participationMode === 'team' ? (
              <Button onClick={() => {
                setIsModeratorRegistration(false);
                setShowTeamRegistrationModal(true);
              }} disabled={!hasFreeSpots} className="gap-2">
                <IconUsers className="h-4 w-4" />
                {participationMode === 'pair' ? tTour('players.pair_registration') : tTour('players.team_registration')}
              </Button>
            ) : (
              <Button onClick={handleSelfSignUp} disabled={!hasFreeSpots}>
                {tTour('registration.sign_up')}
              </Button>
            )
          ) : (
            <Button asChild>
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/tournaments/${code}?tab=players`)}`}>
                {tTour('registration.login_to_register')}
              </Link>
            </Button>
          )}
        </div>
      )}

      <Card className="bg-card/92 shadow-xl shadow-black/30">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconUsers className="h-4 w-4" />
            {localPlayers.length} / {maxPlayers || "∞"} {tTour('players.title').toLowerCase()}
            <button onClick={handleCopyPlayers} className="btn btn-sm btn-ghost">
              <IconCopyCheck/>
            </button>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border-none px-3 py-1 text-xs font-semibold",
              hasFreeSpots ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
            )}
          >
            {hasFreeSpots ? tTour('status.has_free_spots') : tTour('status.full')}
          </Badge>
        </CardHeader>
        <CardContent className="max-h-[480px] space-y-3 overflow-y-auto">
          {localPlayers.length === 0 ? (
            <div className="rounded-xl bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              {tTour('players.no_players')}
            </div>
          ) : (
            localPlayers
              .map((player, index) => ({ player, index })) // Preserve the sorted order
              .sort((a, b) => {
                // Only reorder to put current user on top, preserve original order otherwise
                const aId = a.player.playerReference?._id?.toString() || a.player._id?.toString()
                const bId = b.player.playerReference?._id?.toString() || b.player._id?.toString()
                const currentUserId = localUserPlayerId?.toString()
                if (aId === currentUserId) return -1
                if (bId === currentUserId) return 1
                return a.index - b.index // Preserve original sorted order
              })
              .map(({ player }) => {
              const name = player.playerReference?.name || player.name || player._id
              const status = player.status || "applied"
              const statusMeta = getPlayerStatusBadge(status)
              const isCurrentUser = localUserPlayerId && (player.playerReference?._id?.toString() === localUserPlayerId.toString() || player._id?.toString() === localUserPlayerId.toString())

              return (
                <article
                  key={player._id}
                  className={cn(
                    "flex items-start justify-between gap-4 rounded-xl px-4 py-3 shadow-sm shadow-black/15 transition-all",
                    isCurrentUser ? "bg-primary/15 ring-2 ring-primary/40" : "bg-muted/20"
                  )}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <SmartAvatar 
                        playerId={player.playerReference?._id || player._id} 
                        name={name} 
                        size="md"
                      />
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          {player.playerReference?.type === 'pair' && (
                            <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0 bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                              <IconUsers className="h-3 w-3" />
                              {tTour('teams.pair_badge')}
                            </Badge>
                          )}
                          {player.playerReference?.type === 'team' && (
                            <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <IconUsers className="h-3 w-3" />
                              {tTour('teams.team_badge')}
                            </Badge>
                          )}
                          {statusMeta?.label && (
                            <Badge variant={statusMeta.variant} className="rounded-full px-2 py-0 text-[11px] capitalize">
                              {statusMeta.label}
                            </Badge>
                          )}
                        </div>
                        {/* Show team members if this is a team/pair */}
                        {(player.playerReference?.type === 'pair' || player.playerReference?.type === 'team') && 
                         player.playerReference?.members && 
                         Array.isArray(player.playerReference.members) && 
                         player.playerReference.members.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                            <span className="font-medium">{t("tagok_tq3m")}</span>
                            {player.playerReference.members.map((member: any, idx: number) => (
                              <span key={member._id || idx}>
                                {member.name || member}
                                {idx < player.playerReference.members.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {console.log(player)}
                         {player.playerReference?.honors?.map((honor: any, i: number) => (
                                    <Badge 
                                        key={`${honor.title}-${honor.year}-${i}`} 
                                        variant="secondary" 
                                        className={cn(
                                        "gap-1 text-[10px] font-bold uppercase tracking-wider py-0 h-5",
                                        honor.type === 'rank' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                                        honor.type === 'tournament' ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : 
                                        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        )}
                                    >
                                        {honor.type === 'rank' && <IconMedal className="h-3 w-3" /> }
                                        {honor.type === 'tournament' && <IconTrophy className="h-3 w-3" /> }
                                        {honor.title}
                                    </Badge>
                                ))}
                      
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {player.tournamentStanding && (
                        <span>
                          {t("top_1t11")}<span className="font-semibold text-primary">{player.tournamentStanding}</span>
                        </span>
                      )}
                      <span>
                        HC: <span className="font-semibold text-primary">{player.stats?.highestCheckout || 0}</span>
                      </span>
                      <span>
                        180: <span className="font-semibold text-primary">{player.stats?.oneEightiesCount || 0}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleOpenMatches(player)}>
                        {t("meccsek_ryjy")}</Button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {renderPlayerActions(player)}
                  </div>
                </article>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )

  const waitingContent = (
    <div className="space-y-4">
      {user && localUserPlayerStatus === 'none' && !isOnWaitingList && isPending && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">{t("varolistara_feliratkozas_7cah")}</CardTitle>
            <CardDescription>
              {hasFreeSpots
                ? "Jelentkezhetsz közvetlenül a tornára, de ha szeretnéd, feliratkozhatsz a várólistára is. Ha betelik a torna, automatikusan értesítünk, ha szabad hely születik."
                : "A torna betelt. Feliratkozhatsz a várólistára, és automatikusan értesítünk, ha szabad hely születik."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSubscribeToWaitlist} className="gap-2">
              <IconPlus className="h-4 w-4" />
              {t("feliratkozas_a_varolistara_94fl")}</Button>
          </CardContent>
        </Card>
      )}

      {waitingList.length === 0 ? (
        <Card className="bg-card/90 text-muted-foreground shadow-md shadow-black/25">
          <CardContent className="py-10 text-center text-sm">
            {user && localUserPlayerStatus === 'none' && !isOnWaitingList && isPending
              ? "Még nincs senki a várólistán."
              : "A várólista üres."}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/88 shadow-md shadow-black/25">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {t("varolistan_levo_jatekosok_d12f")}{waitingList.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-3 overflow-y-auto px-4">
            {waitingList.map((waitingPlayer: any, index: number) => {
              const name = waitingPlayer.playerReference?.name || waitingPlayer.playerReference?._id || `Játékos #${index + 1}`
              const isCurrentUser =
                user &&
                (waitingPlayer.playerReference?.userRef?.toString() === user._id ||
                  waitingPlayer.playerReference?._id === localUserPlayerId)

              return (
                <div
                  key={waitingPlayer.playerReference?._id || index}
                  className="flex items-start justify-between gap-3 rounded-xl bg-muted/20 px-4 py-3 shadow-sm shadow-black/15"
                >
                  <div className="flex items-center gap-3">
                    <SmartAvatar 
                      playerId={waitingPlayer.playerReference?._id} 
                      name={name} 
                      size="md"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("felveve_1k3a")}{waitingPlayer.addedAt ? new Date(waitingPlayer.addedAt).toLocaleDateString("hu-HU") : "Ismeretlen"}
                      </p>
                      {waitingPlayer.note && (
                        <p className="mt-1 text-xs text-muted-foreground/80">{t("megjegyzes_tf0a")}{waitingPlayer.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="rounded-full border-none bg-warning/15 px-3 py-0 text-warning">
                      {t("varolista_s58e")}{index + 1}
                    </Badge>
                    {isCurrentUser && (
                      <Button size="sm" variant="outline" onClick={() => handleSelfWithdrawFromWaiting(waitingPlayer)}>
                        {t("leiratkozas_z3ge")}</Button>
                    )}
                    {allowAdminActions && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApproveWaitingPlayer(waitingPlayer)}>
                          {t("elfogadas_qikd")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveWaitingPlayer(waitingPlayer)}>
                          {t("eltavolitas_cmzb")}</Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <div id="registration" className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'registered' | 'waiting')} className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="registered" className="flex-1">
            {tTour('players.title')} ({localPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="waiting" className="flex-1">
            {tTour('waiting_list.title')} ({waitingList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registered">{registeredContent}</TabsContent>
        <TabsContent value="waiting">{waitingContent}</TabsContent>
      </Tabs>

      {!allowPlayerRegistration && isPending && (
        <Alert>
          <AlertDescription>
            {tTour('registration.closed')} {registrationDeadline
              ? tTour('registration.deadline', { date: new Date(registrationDeadline).toLocaleDateString('hu-HU') })
              : ''}
          </AlertDescription>
        </Alert>
      )}

      <PlayerNotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal({ isOpen: false, player: null })}
        player={notificationModal.player}
        tournamentName={tournament?.tournamentSettings?.name || tournament?.name || "Torna"}
      />

      {selectedPlayerForMatches && (
        <PlayerMatchesModal
          isOpen={showPlayerMatchesModal}
          onClose={() => {
            setShowPlayerMatchesModal(false)
            setSelectedPlayerForMatches(null)
          }}
          playerId={selectedPlayerForMatches.id}
          playerName={selectedPlayerForMatches.name}
          tournamentCode={code}
          onShowDetailedStats={async (matchId) => {
            try {
              // Fetch match with legs from API
              const response = await fetch(`/api/matches/${matchId}`)
              if (response.ok) {
                const data = await response.json()
                if (data.success && data.match) {
                  setLegsModal({ isOpen: true, match: data.match })
                }
              }
            } catch (err: any) {
              console.error('Error fetching match details:', err)
              showErrorToast(t("nem_sikerult_betolteni_a_cia4"), {
                error: err?.response?.data?.error,
                context: 'Meccs részletek',
                errorName: 'Meccs részletei sikertelenek',
              })
            }
          }}
        />
      )}

      <LegsViewModal
        isOpen={legsModal.isOpen}
        onClose={() => setLegsModal({ isOpen: false, match: null })}
        match={legsModal.match}
        onBackToMatches={() => setLegsModal({ isOpen: false, match: null })}
      />

      <Dialog
        open={removeConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveConfirm({ isOpen: false })
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tTour('players.remove_player')}</DialogTitle>
            <DialogDescription>
              {tTour('players.remove_confirm', { playerName: removeConfirm.playerName || tTour('players.default_player') })}{' '}
              {tTour('players.remove_confirm_subtitle')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="destructive"
              onClick={async () => {
                if (!removeConfirm.playerId) return
                await handleRemovePlayer(removeConfirm.playerId)
                setRemoveConfirm({ isOpen: false })
              }}
            >
              {t("eltavolitas_cmzb")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamRegistrationModal
        isOpen={showTeamRegistrationModal}
        onClose={() => setShowTeamRegistrationModal(false)}
        tournamentCode={code}
        tournamentName={tournament?.tournamentSettings?.name || tournament?.name || "Torna"}
        clubId={tournament?.clubId?._id || tournament?.clubId}
        onSuccess={() => {
          setShowTeamRegistrationModal(false)
          if (onRefresh) onRefresh()
          router.refresh()
        }}
        isModeratorMode={isModeratorRegistration}
      />
    </div>
  )
}

export default TournamentPlayers