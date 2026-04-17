"use client"

import React, { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  IconChartBar,
} from "@tabler/icons-react"
import { toast } from "react-hot-toast"

import PlayerSearch from "@/components/club/PlayerSearch"
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
import PlayerNotificationModal from "@/components/tournament/PlayerNotificationModal"
import PlayerMatchesModal from "@/components/tournament/PlayerMatchesModal"
import LegsViewModal from "@/components/tournament/LegsViewModal"
import TeamRegistrationModal from "@/components/tournament/TeamRegistrationModal"
import HeadToHeadModal from "@/components/tournament/HeadToHeadModal"
import CountryFlag from "@/components/ui/country-flag"
import HonorAverageBadge from "@/components/player/HonorAverageBadge"
import { getPlayerHonorAverage } from "@/lib/honorAvgBadge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { sortHonorsByPriority } from "@/features/profile/lib/honorSorting"
import {
  addToWaitingListClientAction,
  addTournamentPlayerClientAction,
  getMatchByIdClientAction,
  getTournamentHeadToHeadClientAction,
  promoteFromWaitingListClientAction,
  removeFromWaitingListClientAction,
  removeTournamentPlayerClientAction,
  subscribeToTournamentNotificationsClientAction,
  unsubscribeFromTournamentNotificationsClientAction,
  updateTournamentPlayerStatusClientAction,
} from "@/features/tournaments/actions/tournamentRoster.action"

interface TournamentPlayersProps {
  tournament: any
  players: any[]
  userClubRole: 'admin' | 'moderator' | 'member' | 'none'
  userPlayerStatus: 'applied' | 'checked-in' | 'none'
  userPlayerId: string | null
  status: 'pending' | 'active' | 'finished' | 'group-stage' | 'knockout'
  onRefresh?: () => void | Promise<void>
}

const playerStatusBadge: Record<string, { labelKey?: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  applied: { labelKey: "status.applied", variant: "secondary" },
  "checked-in": { variant: "default" },
  none: { variant: "default" },
}

const getPlayerIdentity = (player: any): string =>
  player?.playerReference?._id?.toString() ||
  player?.playerReference?.toString?.() ||
  player?._id?.toString() ||
  player?.name ||
  "";

const sortPlayers = (list: any[], isFinished: boolean) => {
  if (isFinished) {
    return [...list].sort((a: any, b: any) => {
      const posA = a.tournamentStanding ?? Number.MAX_SAFE_INTEGER
      const posB = b.tournamentStanding ?? Number.MAX_SAFE_INTEGER
      return posA - posB
    })
  }
  return [...list].sort((a: any, b: any) => {
    const nameA = (a.playerReference?.name || a.name || "").toLowerCase()
    const nameB = (b.playerReference?.name || b.name || "").toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

const playersSignature = (list: any[]) =>
  list
    .map((player) => `${getPlayerIdentity(player)}:${player?.status || "applied"}:${player?.tournamentStanding ?? "-"}`)
    .join("|")

const TournamentPlayers: React.FC<TournamentPlayersProps> = ({
  tournament,
  players,
  userClubRole,
  userPlayerStatus,
  userPlayerId,
  status,
  onRefresh,
}) => {
  const tTour = useTranslations("Tournament")
  const tCommon = useTranslations("Common")
  const hasCommonKey = (key: string) => (tCommon as unknown as { has?: (k: string) => boolean }).has?.(key) ?? false
  const tp = (key: string, values?: any) => tTour(`players.${key}`, values)
  const tr = (key: string, values?: any) => tTour(`registration.${key}`, values)
  const tw = (key: string, values?: any) => tTour(`waiting_list.${key}`, values)
  const tn = (key: string, values?: any) => tTour(`notifications.${key}`, values)
  const { user } = useUserContext()

  const [localPlayers, setLocalPlayers] = useState(players)
  const [localUserPlayerStatus, setLocalUserPlayerStatus] = useState(userPlayerStatus)
  const [localUserPlayerId, setLocalUserPlayerId] = useState(userPlayerId)
  const [waitingList, setWaitingList] = useState(tournament?.waitingList || [])
  const [selectedPlayerForMatches, setSelectedPlayerForMatches] = useState<{ id: string; name: string } | null>(null)
  const [showPlayerMatchesModal, setShowPlayerMatchesModal] = useState(false)
  const [headToHeadTarget, setHeadToHeadTarget] = useState<{ id: string; name: string } | null>(null)
  const [notificationModal, setNotificationModal] = useState<{ isOpen: boolean; player: any }>({
    isOpen: false,
    player: null,
  })
  const [notificationTarget, setNotificationTarget] = useState<{
    mode: "single" | "selected"
    playerIds: string[]
    targetCount: number
  }>({
    mode: "single",
    playerIds: [],
    targetCount: 0,
  })
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
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

  const fetchTournamentHeadToHead = useCallback(() => {
    if (!code || !headToHeadTarget?.id) {
      return Promise.resolve({ success: false as const, error: "Missing code or opponent" })
    }
    return getTournamentHeadToHeadClientAction({
      code,
      opponentId: headToHeadTarget.id,
      currentPlayerId: localUserPlayerId?.toString(),
    })
  }, [code, headToHeadTarget?.id, localUserPlayerId])

  const participationMode = tournament?.tournamentSettings?.participationMode || 'individual'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const autoJoinHandledRef = React.useRef(false)
  const lastSyncedPlayersSignatureRef = React.useRef("")

  React.useEffect(() => {
    const isFinished = tournament?.tournamentSettings?.status === "finished"
    const sortedPlayers = sortPlayers(players, isFinished)
    const nextSignature = playersSignature(sortedPlayers)
    if (nextSignature !== lastSyncedPlayersSignatureRef.current) {
      setLocalPlayers(sortedPlayers)
      lastSyncedPlayersSignatureRef.current = nextSignature
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
    setSelectedPlayerIds((prev) => {
      const availableIds = new Set(
        localPlayers
          .map((player) => player?.playerReference?._id?.toString?.() || player?._id?.toString?.())
          .filter((id: string | undefined): id is string => Boolean(id)),
      )
      return prev.filter((id) => availableIds.has(id))
    })
  }, [localPlayers])

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

      const response = await addTournamentPlayerClientAction({ code, ...payload })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        const newPlayer = {
          _id: (response as any).playerId,
          playerReference: {
            name: payload.name || player.name,
            _id: player._id,
            userRef: payload.userRef,
          },
          status: 'applied'
        }
        setLocalPlayers((prev) => {
          const newPlayerId = getPlayerIdentity(newPlayer)
          if (prev.some((existing) => getPlayerIdentity(existing) === newPlayerId)) {
            return prev
          }
          return [...prev, newPlayer]
        })
        // Update user status locally if it was the current user
        if (payload.userRef === user?._id || (player._id && userPlayerId === player._id)) {
           setLocalUserPlayerStatus('applied')
           setLocalUserPlayerId(newPlayer._id)
        }
        toast.success(tp("successfully_added"))
        if (onRefresh) void onRefresh()
      }
    } catch (error: any) {
      console.error("Error adding player:", error)
      toast.error(error.response?.data?.error || tp("error_add"))
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!code) return
    try {
      const response = await removeTournamentPlayerClientAction({ code, playerId })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setLocalPlayers((prev) => prev.filter((p) => p.playerReference._id !== playerId))
        toast.success(tp("successfully_removed"))
      } else {
        showErrorToast('Nem sikerült eltávolítani a játékost.', {
          error: 'removeTournamentPlayerClientAction returned unsuccessful result',
          context: 'Játékos eltávolítása',
          errorName: 'Játékos eltávolítása sikertelen',
        })
      }
    } catch (error: any) {
      showErrorToast(tp("error_remove"), {
        error: error?.response?.data?.error,
        context: 'Játékos eltávolítása',
        errorName: 'Játékos eltávolítása sikertelen',
      })
    }
  }

  const handleCheckInPlayer = async (playerId: string) => {
    if (!code) return
    try {
      const response = await updateTournamentPlayerStatusClientAction({
        playerId,
        status: 'checked-in',
        code,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setLocalPlayers((prev) =>
          prev.map((p) => (p.playerReference?._id === playerId ? { ...p, status: 'checked-in' } : p)),
        )
        toast.success(tp("successfully_checked_in"))
        if (onRefresh) void onRefresh()
      } else {
        showErrorToast('Nem sikerült check-inelni a játékost.', {
          error: 'updateTournamentPlayerStatusClientAction returned unsuccessful result',
          context: 'Játékos check-in',
          errorName: 'Check-in sikertelen',
        })
      }
    } catch (error: any) {
      showErrorToast(tp("error_check_in"), {
        error: error?.response?.data?.error,
        context: 'Játékos check-in',
        errorName: 'Check-in sikertelen',
      })
    }
  }

  const handleSelfSignUp = async () => {
    if (!user?._id || !code) return
    try {
      const response = await addTournamentPlayerClientAction({
        userRef: user._id,
        name: user.name,
        code,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        const newPlayer = {
          _id: (response as any).playerId,
          playerReference: {
            _id: (response as any).playerId,
            name: user.name,
            userRef: user._id,
          },
          status: 'applied',
        }
        setLocalPlayers((prev) => [...prev, newPlayer])
        setLocalUserPlayerStatus('applied')
        setLocalUserPlayerId((response as any).playerId)
        toast.success(tr("sign_up_success"))
      } else {
        showErrorToast('Nem sikerült jelentkezni a tornára.', {
          error: 'addTournamentPlayerClientAction returned unsuccessful result',
          context: 'Saját jelentkezés',
          errorName: 'Jelentkezés sikertelen',
        })
      }
    } catch (error: any) {
      showErrorToast(tr("error_sign_up"), {
        error: error?.response?.data?.error,
        context: 'Saját jelentkezés',
        errorName: 'Jelentkezés sikertelen',
      })
    }
  }

  const handleSelfWithdraw = async (playerIdOverride?: string | null) => {
    const effectivePlayerId = playerIdOverride || localUserPlayerId
    if (!effectivePlayerId || !code) return
    try {
      const response = await removeTournamentPlayerClientAction({
        code,
        playerId: effectivePlayerId,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setLocalPlayers((prev) =>
          prev.filter((p) => p.playerReference?._id?.toString() !== effectivePlayerId.toString()),
        )
        setLocalUserPlayerStatus('none')
        setLocalUserPlayerId(null)
        toast.success(tr("withdraw_success"))
      } else {
        showErrorToast('Nem sikerült visszavonni a jelentkezést.', {
          error: 'removeTournamentPlayerClientAction returned unsuccessful result',
          context: 'Jelentkezés visszavonása',
          errorName: 'Visszavonás sikertelen',
        })
      }
    } catch (error: any) {
      showErrorToast(tr("error_withdraw"), {
        error: error?.response?.data?.error,
        context: 'Jelentkezés visszavonása',
        errorName: 'Visszavonás sikertelen',
      })
    }
  }

  const handleNotifyPlayer = (player: any) => {
    setNotificationTarget({
      mode: "single",
      playerIds: [],
      targetCount: 1,
    })
    setNotificationModal({ isOpen: true, player })
  }

  const handleNotifySelectedPlayers = () => {
    if (selectedPlayerIds.length === 0) {
      toast.error(tTour("notification_modal.error_no_selected_players"))
      return
    }
    setNotificationTarget({
      mode: "selected",
      playerIds: selectedPlayerIds,
      targetCount: selectedPlayerIds.length,
    })
    setNotificationModal({ isOpen: true, player: null })
  }

  const togglePlayerSelection = (playerId: string, checked: boolean) => {
    if (!playerId) return
    setSelectedPlayerIds((prev) => {
      if (checked) {
        if (prev.includes(playerId)) return prev
        return [...prev, playerId]
      }
      return prev.filter((id) => id !== playerId)
    })
  }

  const toggleSelectAllPlayers = (checked: boolean) => {
    if (!checked) {
      setSelectedPlayerIds([])
      return
    }
    const allPlayerIds = localPlayers
      .map((player) => player?.playerReference?._id?.toString?.() || player?._id?.toString?.())
      .filter((id: string | undefined): id is string => Boolean(id))
    setSelectedPlayerIds([...new Set(allPlayerIds)])
  }

  const handleOpenMatches = (player: any) => {
    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString() || player._id?.toString()
    const playerName = player.playerReference?.name || player.name || player._id
    if (playerId && code) {
      setSelectedPlayerForMatches({ id: playerId, name: playerName })
      setShowPlayerMatchesModal(true)
    } else {
      showErrorToast(tp("error_open_matches"), {
        context: 'Játékos meccs megnyitása',
        errorName: 'Meccsek megnyitása sikertelen',
      })
    }
  }


  const handleRemoveFromWaitingList = async (playerId: string) => {
    if (!code) return
    try {
      const response = await removeFromWaitingListClientAction({ code, playerId })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setWaitingList((prev: any[]) => prev.filter((p: any) => p.playerReference._id !== playerId))
        // Check if current user was removed
        if (user && (playerId === localUserPlayerId?.toString() || waitingList.some((p: any) => p.playerReference?._id?.toString() === playerId && p.playerReference?.userRef?.toString() === user._id?.toString()))) {
          setIsOnWaitingList(false)
        }
        toast.success(tw("unsubscribe_success"))
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || tw("error_unsubscribe"), {
        error: err?.response?.data?.error,
        context: 'Várólista kezelés',
        errorName: 'Várólistáról lekerülés sikertelen',
      })
    }
  }

  const handlePromoteFromWaitingList = async (playerId: string) => {
    if (!code) return
    try {
      const response = await promoteFromWaitingListClientAction({ code, playerId })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
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
          toast.success(tw("promote_success"))
        }
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || tw("error_promote"), {
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
      const response = await addToWaitingListClientAction({
        userRef: user._id,
        name: user.name,
        code,
      })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        const newWaitingPlayer = {
          playerReference: {
            _id: (response as any).playerId,
            name: user.name,
            userRef: user._id,
          },
          addedAt: new Date(),
        }
        setWaitingList((prev: any[]) => [...prev, newWaitingPlayer])
        setIsOnWaitingList(true)
        toast.success(tw("subscribe_success"))
      }
    } catch (error: any) {
      showErrorToast(tw("error_subscribe"), {
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
      const response = await subscribeToTournamentNotificationsClientAction({ code })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setIsSubscribedToNotifications(true)
        toast.success(tn("subscribe_success"))
      }
    } catch (error: any) {
      showErrorToast(tn("error_subscribe"), {
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
      const response = await unsubscribeFromTournamentNotificationsClientAction({ code })
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setIsSubscribedToNotifications(false)
        toast.success(tn("unsubscribe_success"))
      }
    } catch (error: any) {
      showErrorToast(tn("error_unsubscribe"), {
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
  const currentUserAppliedEntryId = useMemo(() => {
    if (localUserPlayerId) return localUserPlayerId.toString()
    if (!user?._id) return null

    const currentEntry = localPlayers.find((player: any) => {
      const playerReference = player?.playerReference
      if (!playerReference) return false

      if (playerReference.userRef?.toString() === user._id) return true
      if (playerReference.userRef?._id?.toString() === user._id) return true

      if (Array.isArray(playerReference.members)) {
        return playerReference.members.some((member: any) => {
          const memberUserRef = member?.userRef?._id?.toString() || member?.userRef?.toString()
          return memberUserRef === user._id
        })
      }

      return false
    })

    return currentEntry?.playerReference?._id?.toString() || currentEntry?._id?.toString() || null
  }, [localPlayers, localUserPlayerId, user?._id])
  const isUserRegistered = localUserPlayerStatus !== "none" || Boolean(currentUserAppliedEntryId)

  const clearAutoJoinQuery = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has("autoJoin")) return
    params.delete("autoJoin")
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  React.useEffect(() => {
    const shouldAutoJoin = searchParams.get("autoJoin") === "1"
    if (!shouldAutoJoin || autoJoinHandledRef.current) return

    // Ensure the intent only runs once for this visit.
    autoJoinHandledRef.current = true

    if (!user?._id) return
    if (!allowPlayerRegistration) {
      clearAutoJoinQuery()
      return
    }
    if (!hasFreeSpots) {
      clearAutoJoinQuery()
      return
    }
    if (localUserPlayerStatus !== "none" || isOnWaitingList) {
      clearAutoJoinQuery()
      return
    }
    if (participationMode === "pair" || participationMode === "team") {
      clearAutoJoinQuery()
      return
    }

    void (async () => {
      await handleSelfSignUp()
      clearAutoJoinQuery()
    })()
  }, [
    allowPlayerRegistration,
    clearAutoJoinQuery,
    hasFreeSpots,
    isOnWaitingList,
    localUserPlayerStatus,
    participationMode,
    searchParams,
    user?._id,
  ])

  const handleCopyPlayers = () => {
    try{
      navigator.clipboard.writeText(localPlayers.map((player) => player.playerReference?.name).join('\n'))
      toast.success(tp("successfully_copied"))
    }catch(err){
      console.error(err)
      toast.error(tp("error_add"))
    }
    

  }

  const canManagePlayers = userClubRole === 'admin' || userClubRole === 'moderator'
  const isGlobalAdmin = user?.isAdmin === true
  const canManageOrganizerComms = canManagePlayers || isGlobalAdmin
  const displayedPlayers = useMemo(() => {
    return localPlayers
      .map((player, index) => ({ player, index }))
      .sort((a, b) => {
        const aId = a.player.playerReference?._id?.toString() || a.player._id?.toString()
        const bId = b.player.playerReference?._id?.toString() || b.player._id?.toString()
        const currentUserId = localUserPlayerId?.toString()
        if (aId === currentUserId) return -1
        if (bId === currentUserId) return 1
        return a.index - b.index
      })
  }, [localPlayers, localUserPlayerId])

  const renderPlayerActions = (player: any) => {
    const playerId = player.playerReference?._id
    if (!playerId) return null

    const isCheckedIn = player.status === 'checked-in'
    const isCurrentUser = Boolean(
      currentUserAppliedEntryId && playerId?.toString() === currentUserAppliedEntryId.toString(),
    )
    const canWithdrawOwnApplication =
      isCurrentUser &&
      player.status === "applied" &&
      isPending

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
              <span className="hidden sm:inline">{tTour("players_table.check_in")}</span>
            </Button>
          )
        )}
        {canManageOrganizerComms && status === "pending" && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="info" onClick={() => handleNotifyPlayer(player)} className="gap-1">
              <IconMail className="h-3 w-3" />
              <span className="hidden sm:inline">{tTour("notification_modal.title")}</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setRemoveConfirm({
                  isOpen: true,
                  playerId,
                  playerName: player.playerReference?.name || player.name || tTour("groups.table.unknown"),
                })
              }
            >
              <IconTrash className="h-3 w-3" />
            </Button>
          </div>
        )}
        {canWithdrawOwnApplication ? (
          <Button size="sm" variant="warning" className="gap-1" onClick={() => handleSelfWithdraw(currentUserAppliedEntryId)}>
            <IconTrash className="h-3 w-3" />
            <span className="hidden sm:inline">{tr("withdraw")}</span>
          </Button>
        ) : null}
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
                ? (participationMode === 'pair' ? tTour("players.add_pair") : tTour("players.add_team"))
                : tTour("players.add_player")}
            </CardTitle>
            <CardDescription>
              {participationMode === 'pair' || participationMode === 'team'
                ? tTour("players.search_prompt_team")
                : tTour("players.search_prompt")}
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
                {participationMode === 'pair' ? tTour("players.add_pair") : tTour("players.add_team")}
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

      {canManageOrganizerComms ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{tTour("notification_modal.bulk_title")}</CardTitle>
            <CardDescription>{tTour("notification_modal.bulk_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="info"
              onClick={handleNotifySelectedPlayers}
              disabled={selectedPlayerIds.length === 0}
              className="gap-2"
            >
              <IconMail className="h-4 w-4" />
              {tTour("notification_modal.send_selected", { count: selectedPlayerIds.length })}
            </Button>
          </CardContent>
        </Card>
      ) : null}


      {user && (
        <Alert className="border-indigo-500/40 bg-indigo-500/10 text-white/90 shadow-sm shadow-black/30">
          <AlertDescription className="flex flex-col gap-3">
            {isOnWaitingList ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{tw("on_waiting_list")}</p>
                  <p className="text-xs text-white/70">
                    {tw("on_waiting_list_subtitle")}
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
                  {tw("unsubscribe")}
                </Button>
              </div>
            ) : isUserRegistered ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{tr("already_registered")}</p>
                  <p className="text-xs text-white/70">
                    {tr("already_registered_subtitle")}
                  </p>
                </div>
                {(localUserPlayerStatus === 'applied' || Boolean(currentUserAppliedEntryId)) && (
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => handleSelfWithdraw(currentUserAppliedEntryId)}
                  >
                    {tr("withdraw")}
                  </Button>
                )}
              </div>
            ) : null}
            
            <div className={cn(
              "flex items-center gap-2 pt-2",
              (isUserRegistered || isOnWaitingList) ? "border-t border-indigo-500/20" : ""
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
                    {tn("unsubscribe")}
                  </>
                ) : (
                  <>
                    <IconBell className="h-4 w-4" />
                    {tn("subscribe")}
                  </>
                )}
              </Button>
              <p className="text-xs text-white/70">
                {isSubscribedToNotifications 
                  ? tn("subscribed_message")
                  : tn("subscribe_prompt")}
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
                {participationMode === 'pair' ? tTour("players.pair_registration") : tTour("players.team_registration")}
              </Button>
            ) : (
              <Button onClick={handleSelfSignUp} disabled={!hasFreeSpots}>
                {tr("sign_up")}
              </Button>
            )
          ) : (
            <Button asChild>
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/tournaments/${code}?tab=players&autoJoin=1`)}`}>
                {tr("login_to_register")}
              </Link>
            </Button>
          )}
          <p className="basis-full text-xs text-muted-foreground">{tr("consent_note")}</p>
        </div>
      )}

      <Card className="bg-card/92 shadow-xl shadow-black/30 overflow-hidden border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 bg-muted/10 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm text-foreground font-headline font-bold">
            <IconUsers className="h-5 w-5 text-primary" />
            <span className="uppercase tracking-widest">
              {maxPlayers
                ? tp("player_count", { count: localPlayers.length, max: maxPlayers })
                : tp("player_count_unlimited", { count: localPlayers.length })}
            </span>
            <button onClick={handleCopyPlayers} className="ml-2 hover:text-primary transition-colors text-muted-foreground" title={tp("matches_btn")}>
              <IconCopyCheck size={16} />
            </button>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest",
              hasFreeSpots ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20",
            )}
          >
            {hasFreeSpots ? tTour("players.registration_open") : tTour("players.full_capacity")}
          </Badge>
        </CardHeader>
        <CardContent className="max-h-[600px] p-0 overflow-y-auto custom-scrollbar">
          {localPlayers.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {tp("no_players")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                    {canManageOrganizerComms ? (
                      <th className="px-4 py-4 text-center w-10">
                        <input
                          type="checkbox"
                          checked={localPlayers.length > 0 && selectedPlayerIds.length === localPlayers.length}
                          onChange={(event) => toggleSelectAllPlayers(event.target.checked)}
                          aria-label={tTour("notification_modal.select_all_players")}
                        />
                      </th>
                    ) : null}
                    <th className="px-6 py-4 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground w-10 text-center">#</th>
                    <th className="px-6 py-4 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground max-w-[200px] xl:max-w-none">Player</th>
                    <th className="px-6 py-4 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center hidden md:table-cell">Averages & Stats</th>
                    <th className="px-6 py-4 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {displayedPlayers
                    .map(({ player }, i) => {
                      const name = player.playerReference?.name || player.name || player._id
                      const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString() || player._id?.toString() || ""
                      const status = player.status || "applied"
                      const statusMeta = playerStatusBadge[status]
                      const isCurrentUser = localUserPlayerId && (player.playerReference?._id?.toString() === localUserPlayerId.toString() || player._id?.toString() === localUserPlayerId.toString())
                      const rowNumber = i + 1;
                      const honorsList = sortHonorsByPriority(((player.playerReference?.honors || player.honors || []) as any[]))
                      const honorAverage = getPlayerHonorAverage(player)
                      const rowKey = playerId ? `player-${playerId}` : `fallback-${name}-${i}`;

                      return (
                        <tr
                          key={rowKey}
                          className={cn(
                            "hover:bg-muted/10 transition-colors group",
                            isCurrentUser && "bg-primary/5"
                          )}
                        >
                          {canManageOrganizerComms ? (
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={playerId ? selectedPlayerIds.includes(playerId) : false}
                                onChange={(event) => togglePlayerSelection(playerId, event.target.checked)}
                                disabled={!playerId}
                                aria-label={tTour("notification_modal.select_player", { player: name })}
                              />
                            </td>
                          ) : null}
                          {/* Number / Status Icon */}
                          <td className="px-6 py-4 text-center">
                            {isCurrentUser ? (
                              <IconCheck className="h-5 w-5 text-primary mx-auto" stroke={3} />
                            ) : (
                              <span className="font-headline font-bold text-muted-foreground">{rowNumber}</span>
                            )}
                          </td>
                          
                          {/* Player Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <SmartAvatar 
                                playerId={player.playerReference?._id || player._id} 
                                name={name} 
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-headline font-bold text-foreground text-sm uppercase truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">{name}</p>
                                  <CountryFlag countryCode={player.playerReference?.country} />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {player.playerReference?.type === 'pair' && (
                                    <Badge variant="secondary" className="gap-1 text-[9px] px-1.5 py-0 bg-indigo-500/10 text-indigo-600 border-indigo-500/20 uppercase font-black">
                                      <IconUsers className="h-3 w-3" /> {tTour("statistics.pair")}
                                    </Badge>
                                  )}
                                  {player.playerReference?.type === 'team' && (
                                    <Badge variant="secondary" className="gap-1 text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20 uppercase font-black">
                                      <IconUsers className="h-3 w-3" /> {tTour("statistics.team")}
                                    </Badge>
                                  )}
                                  {statusMeta?.labelKey && (
                                    <Badge variant={statusMeta.variant} className={cn("px-1.5 py-0 text-[9px] uppercase font-black tracking-widest", statusMeta.variant === 'secondary' && "bg-muted text-muted-foreground border-transparent")}>
                                      {tTour(statusMeta.labelKey)}
                                    </Badge>
                                  )}
                                  {honorsList.length > 0 && honorsList.slice(0, 2).map((honor: any, i: number) => {
                                    const honorTooltip = honor.description || (hasCommonKey("honor_badge_tooltip")
                                      ? tCommon("honor_badge_tooltip", { title: honor.title })
                                      : `${honor.title} honor`);
                                    return (
                                      <TooltipProvider key={`${honor.title}-${honor.year}-${i}`}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[9px] font-bold",
                                                honor.type === "rank"
                                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                                  : honor.type === "tournament"
                                                  ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-600"
                                                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
                                              )}
                                            >
                                              {honor.type === "rank" ? <IconMedal className="h-3 w-3" /> : null}
                                              {honor.type === "tournament" ? <IconTrophy className="h-3 w-3" /> : null}
                                              {honor.type !== "rank" && honor.type !== "tournament" ? <IconCheck className="h-3 w-3" /> : null}
                                              <span className="truncate max-w-[100px]">{honor.title}</span>
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>{honorTooltip}</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })}
                                  {honorsList.length > 2 ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-black">
                                            +{honorsList.length - 2}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[280px]">
                                          {(honorsList
                                            .slice(2)
                                            .map((h: any) => `${h.title}${h.year ? ` (${h.year})` : ""}`)
                                            .join(", ")) || "..."}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : null}
                                  <HonorAverageBadge
                                    average={honorAverage}
                                    className="px-1.5 py-0 text-[9px]"
                                    tooltip={honorAverage ? (hasCommonKey("honor_avg_tooltip")
                                      ? tCommon("honor_avg_tooltip", { avg: honorAverage.toFixed(2) })
                                      : `Last 10 closed matches average: ${honorAverage.toFixed(2)}`) : undefined}
                                  />
                                  {/* Show team members if this is a team/pair */}
                                  {(player.playerReference?.type === 'pair' || player.playerReference?.type === 'team') && 
                                  player.playerReference?.members && 
                                  Array.isArray(player.playerReference.members) && 
                                  player.playerReference.members.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                      ({player.playerReference.members.map((m: any) => m.name || m).join(', ')})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Averages & Stats */}
                          <td className="px-6 py-4 text-center hidden md:table-cell">
                             <div className="flex items-center justify-center gap-4">
                                {player.tournamentStanding ? (
                                  <div className="text-center">
                                    <span className="block text-[8px] uppercase tracking-widest text-muted-foreground mb-0.5">{tTour("players.rank_label")}</span>
                                    
                                    <span className="font-headline font-bold text-sm text-foreground">#{player.tournamentStanding}</span>
                                  </div>
                                ) : (
                                  <div className="text-center opacity-30">
                                    <span className="block text-[8px] uppercase tracking-widest text-muted-foreground mb-0.5">{tTour("players.rank_label")}</span>
                                    <span className="font-headline font-bold text-sm text-foreground">—</span>
                                  </div>
                                )}
                                
                                <div className="w-px h-6 bg-border/50"></div>
                                
                                <div className="text-center">
                                  <span className="block text-[8px] uppercase tracking-widest text-muted-foreground mb-0.5">180s</span>
                                  <span className="font-headline font-bold text-sm text-primary">{player.stats?.oneEightiesCount || 0}</span>
                                </div>

                                <div className="w-px h-6 bg-border/50"></div>

                                <div className="text-center">
                                  <span className="block text-[8px] uppercase tracking-widest text-muted-foreground mb-0.5">HC</span>
                                  <span className="font-headline font-bold text-sm text-primary">{player.stats?.highestCheckout || 0}</span>
                                </div>
                             </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1 px-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                onClick={() => handleOpenMatches(player)}
                              >
                                <IconChartBar className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{tp("matches_btn")}</span>
                              </Button>
                              
                              {Boolean(localUserPlayerId) &&
                                playerId !== localUserPlayerId?.toString() &&
                                localUserPlayerStatus !== "none" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-1 px-2 text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => setHeadToHeadTarget({ id: playerId, name })}
                                  >
                                    <IconUsers className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">H2H</span>
                                  </Button>
                                )}
                              
                              {/* Admin Actions */}
                              <div className="flex items-center gap-1 ml-2 border-l border-border/50 pl-2">
                                {renderPlayerActions(player)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const waitingContent = (
    <div className="space-y-4">
      {user && localUserPlayerStatus === 'none' && !isOnWaitingList && isPending && (
        <Card className="border-dashed border-primary/30 bg-primary/5 shadow-xl shadow-black/30">
          <CardHeader>
            <CardTitle className="text-base font-headline uppercase tracking-widest text-primary">{tw("subscribe_card_title")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {hasFreeSpots
                ? tw("subscribe_card_desc_free")
                : tw("subscribe_card_desc_full")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSubscribeToWaitlist} className="gap-2 font-headline font-bold uppercase tracking-widest text-[10px] w-full sm:w-auto">
              <IconPlus className="h-4 w-4" />
              {tw("subscribe")}
            </Button>
          </CardContent>
        </Card>
      )}

      {waitingList.length === 0 ? (
        <Card className="bg-card/92 border-border/50 shadow-xl shadow-black/30 text-muted-foreground">
          <CardContent className="py-12 text-center text-sm font-bold uppercase tracking-widest font-headline">
            {user && localUserPlayerStatus === 'none' && !isOnWaitingList && isPending
              ? tw("no_one")
              : tw("empty")}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/92 shadow-xl shadow-black/30 overflow-hidden border-border/50">
          <CardHeader className="px-6 py-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-sm font-bold font-headline uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <IconUsers className="h-4 w-4 text-warning" />
              {tw("players_count", { count: waitingList.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[480px] p-0 overflow-y-auto custom-scrollbar">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-border/20">
                  {waitingList.map((waitingPlayer: any, index: number) => {
                    const name = waitingPlayer.playerReference?.name || waitingPlayer.playerReference?._id || tw("waitlist_number", { number: index + 1 })
                    const isCurrentUser =
                      user &&
                      (waitingPlayer.playerReference?.userRef?.toString() === user._id ||
                        waitingPlayer.playerReference?._id === localUserPlayerId)

                    return (
                      <tr
                        key={waitingPlayer.playerReference?._id || index}
                        className={cn("hover:bg-muted/10 transition-colors group", isCurrentUser && "bg-warning/5")}
                      >
                        <td className="px-6 py-4 text-center">
                            <span className="font-headline font-bold text-muted-foreground text-xs">{index + 1}.</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <SmartAvatar 
                              playerId={waitingPlayer.playerReference?._id} 
                              name={name} 
                              size="md"
                            />
                            <div className="space-y-1">
                              <p className="text-sm font-headline font-bold uppercase text-foreground">{name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-full border-none bg-amber-500/10 px-2 py-0 text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                                  {tw("title")}
                                </Badge>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {waitingPlayer.addedAt ? tw("added_at", { date: new Date(waitingPlayer.addedAt).toLocaleDateString("hu-HU") }) : "—"}
                                </p>
                              </div>
                              {waitingPlayer.note && (
                                <p className="mt-1 rounded-md border border-border/50 px-2 py-1 text-[10px] text-muted-foreground">{tw("note", { note: waitingPlayer.note })}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isCurrentUser && (
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] uppercase font-bold tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleSelfWithdrawFromWaiting(waitingPlayer)}>
                                {tw("unsubscribe")}
                              </Button>
                            )}
                            {allowAdminActions && (
                              <div className="flex items-center gap-1 ml-2 border-l border-border/50 pl-2">
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] uppercase font-bold tracking-widest text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleApproveWaitingPlayer(waitingPlayer)}>
                                  {tw("btn_approve")}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveWaitingPlayer(waitingPlayer)}>
                                  {tw("btn_remove")}
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <div id="registration" className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'registered' | 'waiting')} className="space-y-4">
        <TabsList className="flex w-full min-w-max gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="registered" className="shrink-0 min-w-[170px]">
            {tTour("players.title")} ({localPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="waiting" className="shrink-0 min-w-[170px]">
            {tw("title")} ({waitingList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registered">{registeredContent}</TabsContent>
        <TabsContent value="waiting">{waitingContent}</TabsContent>
      </Tabs>

      {!allowPlayerRegistration && isPending && (
        <Alert>
          <AlertDescription>
            {tr("closed")} {registrationDeadline
              ? tr("deadline", { date: new Date(registrationDeadline).toLocaleDateString('hu-HU') })
              : ''}
          </AlertDescription>
        </Alert>
      )}

      {notificationModal.isOpen ? (
        <PlayerNotificationModal
          isOpen={notificationModal.isOpen}
          onClose={() => setNotificationModal({ isOpen: false, player: null })}
          mode={notificationTarget.mode}
          player={notificationModal.player}
          playerIds={notificationTarget.playerIds}
          targetCount={notificationTarget.targetCount}
          tournamentCode={code || ""}
          tournamentName={tournament?.tournamentSettings?.name || tournament?.name || "Torna"}
        />
      ) : null}

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
              const data = await getMatchByIdClientAction({ matchId })
              if (data && typeof data === 'object' && 'success' in data && data.success && 'match' in data) {
                setLegsModal({ isOpen: true, match: (data as any).match })
              }
            } catch (err: any) {
              console.error('Error fetching match details:', err)
              showErrorToast('Nem sikerült betölteni a meccs részleteit', {
                error: err?.response?.data?.error,
                context: 'Meccs részletek',
                errorName: 'Meccs részletei sikertelenek',
              })
            }
          }}
        />
      )}

      {headToHeadTarget && code && (
        <HeadToHeadModal
          isOpen={Boolean(headToHeadTarget)}
          onClose={() => setHeadToHeadTarget(null)}
          fetchData={fetchTournamentHeadToHead}
        />
      )}

      {legsModal.isOpen ? (
        <LegsViewModal
          isOpen={legsModal.isOpen}
          onClose={() => setLegsModal({ isOpen: false, match: null })}
          match={legsModal.match}
          onBackToMatches={() => setLegsModal({ isOpen: false, match: null })}
        />
      ) : null}

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
            <DialogTitle>{tp("remove_player")}</DialogTitle>
            <DialogDescription>
              {tp("remove_confirm", { playerName: removeConfirm.playerName || tp("default_player") })}
              {" "}
              {tp("remove_confirm_subtitle")}
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
              {tTour("players_table.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showTeamRegistrationModal ? (
        <TeamRegistrationModal
          isOpen={showTeamRegistrationModal}
          onClose={() => setShowTeamRegistrationModal(false)}
          tournamentCode={code}
          tournamentName={tournament?.tournamentSettings?.name || tournament?.name || "Torna"}
          clubId={tournament?.clubId?._id || tournament?.clubId}
          onSuccess={() => {
            setShowTeamRegistrationModal(false)
            if (onRefresh) onRefresh()
          }}
          isModeratorMode={isModeratorRegistration}
        />
      ) : null}
    </div>
  )
}

export default TournamentPlayers