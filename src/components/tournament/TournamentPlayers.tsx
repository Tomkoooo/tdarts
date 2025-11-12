"use client"

import React, { useMemo, useState } from "react"
import axios from "axios"
import Link from "next/link"
import {
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface TournamentPlayersProps {
  tournament: any
  players: any[]
  userClubRole: 'admin' | 'moderator' | 'member' | 'none'
  userPlayerStatus: 'applied' | 'checked-in' | 'none'
  userPlayerId: string | null
}

const playerStatusBadge: Record<string, { label?: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  applied: { label: "Jelentkezett", variant: "secondary" },
  "checked-in": { variant: "default" },
  none: { label: "", variant: "default" },
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

  const code = tournament?.tournamentId

  React.useEffect(() => {
    setLocalPlayers(players)
    setLocalUserPlayerStatus(userPlayerStatus)
    setLocalUserPlayerId(userPlayerId)
    setWaitingList(tournament?.waitingList || [])
  }, [players, userPlayerStatus, userPlayerId, tournament?.waitingList])

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
    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString() || player._id?.toString()
    const playerName = player.playerReference?.name || player.name || player._id
    if (playerId && code) {
      setSelectedPlayerForMatches({ id: playerId, name: playerName })
      setShowPlayerMatchesModal(true)
    } else {
      toast.error('Nem sikerült megnyitni a meccseket: hiányzó játékos azonosító')
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



  const canManagePlayers = userClubRole === 'admin' || userClubRole === 'moderator'

  const renderPlayerActions = (player: any) => {
    const playerId = player.playerReference?._id
    if (!playerId) return null

    const isCheckedIn = player.status === 'checked-in'

    return (
      <div className="flex items-center gap-2">
        {isCheckedIn ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <IconCheck className="h-3.5 w-3.5" />
          </span>
        ) : (
          allowAdminActions && canManagePlayers && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={() => handleCheckInPlayer(playerId)}
            >
              <IconCheck className="h-3 w-3" />
              Check-in
            </Button>
          )
        )}
        {canManagePlayers && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="info" onClick={() => handleNotifyPlayer(player)} className="gap-1">
              <IconMail className="h-3 w-3" />
              Üzenet
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
        <Alert className="border-primary/40 bg-primary/15 text-white/90 shadow-sm shadow-black/30">
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Már jelentkeztél erre a tornára.</p>
              <p className="text-xs text-white/70">
                Ha mégsem tudsz részt venni, itt visszavonhatod a jelentkezésedet.
              </p>
            </div>
            {isPending ? (
              <Button size="sm" variant="outline" onClick={handleSelfWithdraw}>
                Jelentkezés visszavonása
              </Button>
            ) : null}
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
        </div>
      )}

      <Card className="bg-card/92 shadow-xl shadow-black/30">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconUsers className="h-4 w-4" />
            {localPlayers.length} / {maxPlayers || "∞"} játékos
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border-none px-3 py-1 text-xs font-semibold",
              hasFreeSpots ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400",
            )}
          >
            {hasFreeSpots ? "Van szabad hely" : "Megtelt"}
          </Badge>
        </CardHeader>
        <CardContent className="max-h-[480px] space-y-3 overflow-y-auto">
          {localPlayers.length === 0 ? (
            <div className="rounded-xl bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Még nincsenek játékosok.
            </div>
          ) : (
            localPlayers
              .sort((a, b) => {
                const aId = a.playerReference?._id?.toString() || a._id?.toString()
                const bId = b.playerReference?._id?.toString() || b._id?.toString()
                const currentUserId = localUserPlayerId?.toString()
                if (aId === currentUserId) return -1
                if (bId === currentUserId) return 1
                return 0
              })
              .map((player) => {
              const name = player.playerReference?.name || player.name || player._id
              const status = player.status || "applied"
              const statusMeta = playerStatusBadge[status]
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      {statusMeta?.label && (
                        <Badge variant={statusMeta.variant} className="rounded-full px-2 py-0 text-[11px] capitalize">
                          {statusMeta.label}
                        </Badge>
                      )}
                    </div>
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
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleOpenMatches(player)}>
                        Meccsek
                      </Button>
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
    <div className="space-y-3">
      {waitingList.length === 0 ? (
        <Card className="bg-card/90 text-muted-foreground shadow-md shadow-black/25">
          <CardContent className="py-10 text-center text-sm">A várólista üres.</CardContent>
        </Card>
      ) : (
        <Card className="bg-card/88 shadow-md shadow-black/25">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Várólistán lévő játékosok: {waitingList.length}
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
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      Felvéve: {waitingPlayer.addedAt ? new Date(waitingPlayer.addedAt).toLocaleDateString("hu-HU") : "Ismeretlen"}
                    </p>
                    {waitingPlayer.note && (
                      <p className="mt-1 text-xs text-muted-foreground/80">Megjegyzés: {waitingPlayer.note}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="rounded-full border-none bg-amber-500/15 px-3 py-0 text-amber-500">
                      Várólista #{index + 1}
                    </Badge>
                    {isCurrentUser && (
                      <Button size="sm" variant="outline" onClick={() => handleSelfWithdrawFromWaiting(waitingPlayer)}>
                        Leiratkozás
                      </Button>
                    )}
                    {allowAdminActions && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApproveWaitingPlayer(waitingPlayer)}>
                          Elfogadás
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveWaitingPlayer(waitingPlayer)}>
                          Eltávolítás
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            )}
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
                  setShowPlayerMatchesModal(false)
                }
              }
            } catch (err) {
              console.error('Error fetching match details:', err)
              toast.error('Nem sikerült betölteni a meccs részleteit')
            }
          }}
        />
      )}

      <LegsViewModal
        isOpen={legsModal.isOpen}
        onClose={() => setLegsModal({ isOpen: false, match: null })}
        match={legsModal.match}
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
            <DialogTitle>Játékos eltávolítása</DialogTitle>
            <DialogDescription>
              Biztosan el szeretnéd távolítani{' '}
              <span className="font-semibold text-foreground">{removeConfirm.playerName}</span> játékost a tornáról?
              A művelet nem visszavonható.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setRemoveConfirm({ isOpen: false })}
            >
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!removeConfirm.playerId) return
                await handleRemovePlayer(removeConfirm.playerId)
                setRemoveConfirm({ isOpen: false })
              }}
            >
              Eltávolítás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TournamentPlayers 