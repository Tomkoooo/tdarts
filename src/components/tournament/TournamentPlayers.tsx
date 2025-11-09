"use client"

import React, { useMemo, useState } from "react"
import axios from "axios"
import Link from "next/link"
import {
  IconBell,
  IconBellOff,
  IconCheck,
  IconMail,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { toast } from "react-hot-toast"

import PlayerSearch from "@/components/club/PlayerSearch"
import PlayerNotificationModal from "@/components/tournament/PlayerNotificationModal"
import PlayerMatchesModal from "@/components/tournament/PlayerMatchesModal"
import LegsViewModal from "@/components/tournament/LegsViewModal"
import { useUserContext } from "@/hooks/useUser"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TournamentPlayersProps {
  tournament: any
  players: any[]
  userClubRole: 'admin' | 'moderator' | 'member' | 'none'
  userPlayerStatus: 'applied' | 'checked-in' | 'none'
  userPlayerId: string | null
}

const playerStatusBadge: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  applied: { label: "Jelentkezett", variant: "secondary" },
  "checked-in": { label: "Check-in", variant: "default" },
  none: { label: "" , variant: "default" },
}

const TournamentPlayers: React.FC<TournamentPlayersProps> = ({
  tournament,
  players,
  userClubRole,
  userPlayerStatus,
  userPlayerId,
}) => {
  const { user } = useUserContext()

  const [error, setError] = useState("")
  const [localPlayers, setLocalPlayers] = useState(players)
  const [localUserPlayerStatus, setLocalUserPlayerStatus] = useState(userPlayerStatus)
  const [localUserPlayerId, setLocalUserPlayerId] = useState(userPlayerId)
  const [waitingList, setWaitingList] = useState(tournament?.waitingList || [])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [selectedPlayerForMatches, setSelectedPlayerForMatches] = useState<{ id: string; name: string } | null>(null)
  const [showPlayerMatchesModal, setShowPlayerMatchesModal] = useState(false)
  const [notificationModal, setNotificationModal] = useState<{ isOpen: boolean; player: any }>({
    isOpen: false,
    player: null,
  })
  const [legsModal, setLegsModal] = useState<{ isOpen: boolean; match: any }>({ isOpen: false, match: null })
  const [activeTab, setActiveTab] = useState<'registered' | 'waiting'>('registered')

  const code = tournament?.tournamentId

  React.useEffect(() => {
    setLocalPlayers(players)
    setLocalUserPlayerStatus(userPlayerStatus)
    setLocalUserPlayerId(userPlayerId)
    setWaitingList(tournament?.waitingList || [])
  }, [players, userPlayerStatus, userPlayerId, tournament?.waitingList])

  React.useEffect(() => {
    if (user && tournament?.notificationSubscribers) {
      const subscribed = tournament.notificationSubscribers.some(
        (s: any) =>
          s.userRef?._id?.toString() === user._id ||
          s.userRef?.toString() === user._id,
      )
      setIsSubscribed(subscribed)
    }
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
            _id: response.data.playerId,
            name: player.name,
            userRef: player.userRef,
          },
          status: 'applied',
        }
        setLocalPlayers((prev) => [...prev, newPlayer])
        toast.success(`${player.name || 'Játékos'} sikeresen hozzáadva!`)
      } else {
        setError('Nem sikerült hozzáadni a játékost.')
        toast.error('Nem sikerült hozzáadni a játékost.')
      }
    } catch {
      setError('Nem sikerült hozzáadni a játékost.')
      toast.error('Nem sikerült hozzáadni a játékost.')
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!code) return
    const player = localPlayers.find((p) => p.playerReference._id === playerId)
    const playerName = player?.playerReference?.name || player?.name || 'Játékos'

    if (!window.confirm(`Biztosan el szeretnéd távolítani ${playerName} játékost a tornáról? Ez a művelet nem vonható vissza.`)) {
      return
    }

    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId } })
      if (response.data.success) {
        setLocalPlayers((prev) => prev.filter((p) => p.playerReference._id !== playerId))
        toast.success('Játékos sikeresen eltávolítva!')
      } else {
        setError('Nem sikerült eltávolítani a játékost.')
        toast.error('Nem sikerült eltávolítani a játékost.')
      }
    } catch {
      setError('Nem sikerült eltávolítani a játékost.')
      toast.error('Nem sikerült eltávolítani a játékost.')
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
        toast.success('Játékos sikeresen check-inelve!')
      } else {
        setError('Nem sikerült check-inelni a játékost.')
        toast.error('Nem sikerült check-inelni a játékost.')
      }
    } catch {
      setError('Nem sikerült check-inelni a játékost.')
      toast.error('Nem sikerült check-inelni a játékost.')
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
        toast.success('Sikeresen jelentkeztél a tornára!')
      } else {
        setError('Nem sikerült jelentkezni a tornára.')
        toast.error('Nem sikerült jelentkezni a tornára.')
      }
    } catch {
      setError('Nem sikerült jelentkezni a tornára.')
      toast.error('Nem sikerült jelentkezni a tornára.')
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
        toast.success('Jelentkezés sikeresen visszavonva!')
      } else {
        setError('Nem sikerült visszavonni a jelentkezést.')
        toast.error('Nem sikerült visszavonni a jelentkezést.')
      }
    } catch {
      setError('Nem sikerült visszavonni a jelentkezést.')
      toast.error('Nem sikerült visszavonni a jelentkezést.')
    }
  }

  const handleNotifyPlayer = (player: any) => {
    setNotificationModal({ isOpen: true, player })
  }

  const handleOpenMatches = (player: any) => {
    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString()
    const playerName = player.playerReference?.name || player.name || player._id
    if (playerId) {
      setSelectedPlayerForMatches({ id: playerId, name: playerName })
      setShowPlayerMatchesModal(true)
    }
  }

  const handleAddToWaitingList = async () => {
    if (!user?._id || !code) return
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
        toast.success('Sikeresen felkerültél a várólistára!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült felkerülni a várólistára.')
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
        toast.success('Sikeresen lekerültél a várólistáról!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült lekerülni a várólistáról.')
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
          toast.success('Játékos sikeresen áthelyezve a tornára!')
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült áthelyezni a játékost.')
    }
  }

  const handleSubscribeToNotifications = async () => {
    if (!code) return
    try {
      const response = await axios.post(`/api/tournaments/${code}/notifications`)
      if (response.data.success) {
        setIsSubscribed(true)
        toast.success('Sikeresen feliratkoztál az értesítésekre!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült feliratkozni.')
    }
  }

  const handleUnsubscribeFromNotifications = async () => {
    if (!code) return
    try {
      const response = await axios.delete(`/api/tournaments/${code}/notifications`)
      if (response.data.success) {
        setIsSubscribed(false)
        toast.success('Sikeresen leiratkoztál az értesítésekről!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült leiratkozni.')
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

  const waitingListIncludesUser = useMemo(
    () =>
      user
        ? waitingList.some(
            (p: any) =>
              p.playerReference?.userRef?.toString() === user._id ||
              p.playerReference?._id?.toString() === userPlayerId,
          )
        : false,
    [waitingList, user, userPlayerId],
  )

  const renderPlayerActions = (player: any) => {
    const playerId = player.playerReference?._id
    if (!playerId) return null

    return (
      <div className="flex items-center gap-2">
        {player.status === 'checked-in' && (
          <Badge variant="default" className="gap-1">
            <IconCheck className="h-3 w-3" /> Check-in
          </Badge>
        )}
        {allowAdminActions && (userClubRole === 'admin' || userClubRole === 'moderator') && (
          <div className="flex items-center gap-1">
            {player.status !== 'checked-in' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCheckInPlayer(playerId)}
              >
                Check-in
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => handleNotifyPlayer(player)}>
              <IconMail className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleRemovePlayer(playerId)}>
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
            <CardTitle className="text-base">Játékos hozzáadása</CardTitle>
            <CardDescription>
              Keress rá egy játékosra vagy vedd fel kézzel a tornára.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerSearch
              onPlayerSelected={handleAddPlayer}
              clubId={tournament?.clubId?._id || tournament?.clubId}
              isForTournament
              excludePlayerIds={localPlayers
                .map((p) => p.playerReference?._id?.toString() || p._id?.toString())
                .filter(Boolean)}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {user && localUserPlayerId && localUserPlayerStatus !== 'none' && (
        <Alert className="border-secondary/60 bg-secondary/10">
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-secondary">Már jelentkezett erre a tornára.</p>
              <p className="text-xs text-muted-foreground">
                Ha mégsem tudsz részt venni, itt visszavonhatod a jelentkezésedet.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleSelfWithdraw}>
              Jelentkezés visszavonása
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {allowPlayerRegistration && localUserPlayerStatus === 'none' && (
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <Button onClick={handleSelfSignUp} disabled={!hasFreeSpots}>
              Jelentkezés a tornára
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/tournaments/${code}`)}`}>
                Jelentkezéshez lépj be
              </Link>
            </Button>
          )}
          {!hasFreeSpots && user && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-amber-500 text-amber-500">
                Torna megtelt
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={isSubscribed ? handleUnsubscribeFromNotifications : handleSubscribeToNotifications}
                className="gap-2"
              >
                {isSubscribed ? <IconBellOff className="h-4 w-4" /> : <IconBell className="h-4 w-4" />}
                {isSubscribed ? 'Leiratkozás értesítésről' : 'Értesítést kérek'}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border-0 bg-card/50 shadow-sm">
        <div className="flex items-center justify-between border-b-0 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconUsers className="h-4 w-4" />
            {localPlayers.length} / {maxPlayers || '∞'} játékos
          </div>
          {hasFreeSpots ? (
            <Badge variant="outline" className="border-emerald-500 text-emerald-500">
              Van szabad hely
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500 text-amber-500">
              Megtelt
            </Badge>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {localPlayers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Még nincsenek játékosok.
            </div>
          ) : (
            <div className="divide-y border-t-0">
              {localPlayers.map((player) => {
                const name = player.playerReference?.name || player.name || player._id
                const status = player.status || 'applied'
                const statusMeta = playerStatusBadge[status]

                return (
                  <div key={player._id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        {statusMeta?.label && (
                          <Badge variant={statusMeta.variant} className="capitalize">
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                      {!allowAdminActions && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {player.tournamentStanding && (
                            <span>
                              Top <span className="font-semibold text-primary">{player.tournamentStanding}</span>
                            </span>
                          )}
                          <span>
                            HC: <span className="font-semibold text-primary">{player.stats?.highestCheckout || 0}</span>
                          </span>
                          <span>
                            180: <span className="font-semibold text-primary">{player.stats?.oneEightiesCount || 0}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {renderPlayerActions(player)}
                      {!allowAdminActions && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenMatches(player)}
                        >
                          Meccsek
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const waitingContent = (
    <div className="space-y-4">
      {waitingList.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            A várólista üres.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border-0 bg-card/50 shadow-sm">
          <div className="border-b-0 px-4 py-3 text-sm text-muted-foreground">
            Várólistán lévő játékosok: {waitingList.length}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {waitingList.map((waitingPlayer: any, index: number) => {
              const name = waitingPlayer.playerReference?.name || waitingPlayer.playerReference?._id || `Játékos #${index + 1}`
              const isCurrentUser = user && (waitingPlayer.playerReference?.userRef?.toString() === user._id || waitingPlayer.playerReference?._id === localUserPlayerId)

              return (
                <div key={waitingPlayer.playerReference?._id || index} className="flex items-start justify-between gap-3 border-t-0 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      Felvéve: {waitingPlayer.addedAt ? new Date(waitingPlayer.addedAt).toLocaleDateString('hu-HU') : 'Ismeretlen'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {userClubRole !== 'member' && allowAdminActions && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromoteFromWaitingList(waitingPlayer.playerReference._id)}
                      >
                        Áthelyezés
                      </Button>
                    )}
                    {isCurrentUser ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveFromWaitingList(waitingPlayer.playerReference._id)}
                      >
                        Lejelentkezés
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {user && localUserPlayerStatus === 'none' && isPending && !waitingListIncludesUser && !hasFreeSpots && (
        <Button onClick={handleAddToWaitingList} className="w-full">
          Feliratkozás a várólistára
        </Button>
      )}
    </div>
  )

  return (
    <div id="registration" className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'registered' | 'waiting')} className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="registered" className="flex-1">
            Játékosok ({localPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="waiting" className="flex-1">
            Várólista ({waitingList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registered">{registeredContent}</TabsContent>
        <TabsContent value="waiting">{waitingContent}</TabsContent>
      </Tabs>

      {!allowPlayerRegistration && isPending && (
        <Alert>
          <AlertDescription>
            A nevezés lezárult. {registrationDeadline
              ? `Határidő: ${new Date(registrationDeadline).toLocaleDateString('hu-HU')}`
              : ''}
          </AlertDescription>
        </Alert>
      )}

      <PlayerNotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal({ isOpen: false, player: null })}
        player={notificationModal.player}
        tournamentId={code}
      />

      <PlayerMatchesModal
        isOpen={showPlayerMatchesModal}
        onClose={() => setShowPlayerMatchesModal(false)}
        player={selectedPlayerForMatches}
        tournamentId={code}
        onOpenLegs={(match) => setLegsModal({ isOpen: true, match })}
      />

      <LegsViewModal
        isOpen={legsModal.isOpen}
        onClose={() => setLegsModal({ isOpen: false, match: null })}
        match={legsModal.match}
      />
    </div>
  )
}

export default TournamentPlayers 