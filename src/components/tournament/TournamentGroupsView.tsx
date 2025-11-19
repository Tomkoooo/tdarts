"use client"

import React, { useState } from 'react'
import LegsViewModal from './LegsViewModal'
import { IconArrowUp, IconArrowDown, IconChevronDown, IconEye, IconEdit, IconTarget } from '@tabler/icons-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from "@/components/ui/Input"
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface Player {
  playerId: {
    _id: string
    name: string
  }
  legsWon?: number
  legsLost?: number
  average?: number
  highestCheckout?: number
  oneEightiesCount?: number
}

interface Match {
  _id: string
  player1: Player
  player2: Player
  status: string
  winnerId?: string
  legsToWin?: number
  scorer?: {
    _id: string
    name: string
  }
  stats?: {
    player1: {
      average: number
      legsWon: number
    }
    player2: {
      average: number
      legsWon: number
    }
  }
}

interface TournamentGroupsViewProps {
  tournament: any
  userClubRole?: 'admin' | 'moderator' | 'member' | 'none'
}

const TournamentGroupsView: React.FC<TournamentGroupsViewProps> = ({ tournament, userClubRole }) => {
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [player1Legs, setPlayer1Legs] = useState(0)
  const [player2Legs, setPlayer2Legs] = useState(0)
  const [player1Stats, setPlayer1Stats] = useState({
    highestCheckout: 0,
    oneEightiesCount: 0,
    totalThrows: 0,
    totalScore: 0
  })
  const [player2Stats, setPlayer2Stats] = useState({
    highestCheckout: 0,
    oneEightiesCount: 0,
    totalThrows: 0,
    totalScore: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set())
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'ongoing' | 'finished'>('all')
  const [showLegsModal, setShowLegsModal] = useState(false)
  const [selectedMatchForLegs, setSelectedMatchForLegs] = useState<Match | null>(null)

  const isAdminOrModerator = userClubRole === 'admin' || userClubRole === 'moderator'

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleMatches = (groupId: string) => {
    const newExpanded = new Set(expandedMatches)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedMatches(newExpanded)
  }

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match)
    setPlayer1Legs(match.player1.legsWon || 0)
    setPlayer2Legs(match.player2.legsWon || 0)
    setPlayer1Stats({
      highestCheckout: match.player1.highestCheckout || 0,
      oneEightiesCount: match.player1.oneEightiesCount || 0,
      totalThrows: 0,
      totalScore: 0
    })
    setPlayer2Stats({
      highestCheckout: match.player2.highestCheckout || 0,
      oneEightiesCount: match.player2.oneEightiesCount || 0,
      totalThrows: 0,
      totalScore: 0
    })
    setShowAdminModal(true)
    setError('')
  }

  const handleViewLegs = (match: Match) => {
    setSelectedMatchForLegs(match)
    setShowLegsModal(true)
  }

  const handleMovePlayer = async (groupId: string, playerId: string, direction: 'up' | 'down') => {
    if (userClubRole !== 'admin' && userClubRole !== 'moderator') {
      toast.error('Nincs jogosultságod a helyezés módosításához!')
      return
    }

    const confirmMessage = `Biztosan módosítod a játékos helyezését?\n\n⚠️ FONTOS: Ez a módosítás minden meccs végén újra szükséges lehet, mivel a rendszer automatikusan újraszámolja a helyezéseket.`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const response = await axios.patch(`/api/tournaments/${tournament.tournamentId}/groups/${groupId}/move-player`, {
        playerId,
        direction
      })

      if (response.data.success) {
        toast.success('Helyezés sikeresen módosítva!', {
          duration: 4000,
        })
        window.location.reload()
      } else {
        toast.error('Hiba történt a helyezés módosítása során!')
      }
    } catch (error) {
      console.error('Error moving player:', error)
      toast.error('Hiba történt a helyezés módosítása során!')
    }
  }

  const handleSaveMatch = async () => {
    if (!selectedMatch) return

    // Convert empty strings to 0
    const cleanedPlayer1Legs = player1Legs === '' ? 0 : player1Legs;
    const cleanedPlayer2Legs = player2Legs === '' ? 0 : player2Legs;

    if (cleanedPlayer1Legs === cleanedPlayer2Legs) {
      setError('Nem lehet döntetlen! Egyik játékosnak több leg-et kell nyernie.')
      return
    }

    setLoading(true)
    setError('')

    const cleanedPlayer1Stats = {
      ...player1Stats,
      oneEightiesCount: player1Stats.oneEightiesCount === '' ? 0 : player1Stats.oneEightiesCount,
      highestCheckout: player1Stats.highestCheckout === '' ? 0 : player1Stats.highestCheckout,
    };

    const cleanedPlayer2Stats = {
      ...player2Stats,
      oneEightiesCount: player2Stats.oneEightiesCount === '' ? 0 : player2Stats.oneEightiesCount,
      highestCheckout: player2Stats.highestCheckout === '' ? 0 : player2Stats.highestCheckout,
    };

    try {
      const response = await fetch(`/api/matches/${selectedMatch._id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1LegsWon: cleanedPlayer1Legs,
          player2LegsWon: cleanedPlayer2Legs,
          player1Stats: cleanedPlayer1Stats,
          player2Stats: cleanedPlayer2Stats
        })
      })

      if (!response.ok) {
        throw new Error('Hiba történt a mentés során')
      }

      setShowAdminModal(false)
      setSelectedMatch(null)
      window.location.reload()
    } catch (err) {
      setError('Hiba történt a mentés során!')
      console.error('Save match error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!tournament.groups || tournament.groups.length === 0) {
    return (
      <Card className="bg-card/90 text-muted-foreground shadow-xl shadow-black/30">
        <CardContent className="py-12 text-center text-sm">
          Még nincsenek csoportok generálva.
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Függőben</Badge>
      case 'ongoing':
        return <Badge variant="info">Folyamatban</Badge>
      case 'finished':
        return <Badge variant="success">Befejezett</Badge>
      default:
        return <Badge variant="outline">Ismeretlen</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Csoportok</h2>
      <div className="space-y-4">
        {tournament.groups.map((group: any, groupIndex: number) => {
          const groupPlayers = tournament.tournamentPlayers
            .filter((player: any) => player.groupId === group._id)
            .sort((a: any, b: any) => (a.groupStanding || 0) - (b.groupStanding || 0))
          
          const isExpanded = expandedGroups.has(group._id)
          const isMatchesExpanded = expandedMatches.has(group._id)

          return (
            <Card key={group._id} className="bg-card/92 shadow-xl shadow-black/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    Csoport {groupIndex + 1} (Tábla {group.board})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleGroup(group._id)}
                    className="h-8 w-8"
                  >
                    <IconChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {/* Collapsed State - Compact Player Cards */}
                {!isExpanded && (
                  <div className="flex flex-wrap gap-2">
                    {groupPlayers.map((player: any, index: number) => (
                      <div
                        key={player._id}
                        className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2 shadow-sm shadow-black/15"
                      >
                        <Badge variant="default" className="text-[10px] font-bold px-1.5 py-0">
                          {player.groupStanding || index + 1}.
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {player.playerReference?.name || 'Ismeretlen'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {(player.stats?.matchesWon || 0) * 2}p
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded State */}
                {isExpanded && (
                  <div className="space-y-6">
                    {/* Players Table */}
                    <div>
                      <h4 className="font-semibold text-base mb-3 text-foreground">Játékosok Rangsora</h4>
                      <div className="overflow-x-auto rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30">
                            <tr>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">#</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Név</th>
                              {isAdminOrModerator && (
                                <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Mozgatás</th>
                              )}
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Pont</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Gy</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">V</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">L Gy</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">L V</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">L ±</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Átlag</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">180</th>
                              <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">HC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20">
                            {groupPlayers.map((player: any, index: number) => {
                              const stats = player.stats || {}
                              const legDifference = (stats.legsWon || 0) - (stats.legsLost || 0)
                              
                              return (
                                <tr key={player._id} className="hover:bg-muted/20 transition-colors">
                                  <td className="text-center px-3 py-2 font-bold text-xs">
                                    {player.groupOrdinalNumber + 1}.
                                  </td>
                                  <td className="px-3 py-2 font-semibold text-sm">
                                    {player.playerReference?.name || 'Ismeretlen'}
                                  </td>
                                  {isAdminOrModerator && (
                                    <td className="text-center px-2 py-2">
                                      <div className="flex flex-col gap-1 items-center">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleMovePlayer(group._id, player._id, 'up')}
                                          disabled={index === 0}
                                          className="h-6 w-6"
                                        >
                                          <IconArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleMovePlayer(group._id, player._id, 'down')}
                                          disabled={index === groupPlayers.length - 1}
                                          className="h-6 w-6"
                                        >
                                          <IconArrowDown className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                  <td className="text-center px-2 py-2 text-sm font-medium">
                                    {(stats.matchesWon || 0) * 2}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm text-[oklch(64%_0.2_132)]">
                                    {stats.matchesWon || 0}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm text-destructive">
                                    {stats.matchesLost || 0}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm text-[oklch(64%_0.2_132)]">
                                    {stats.legsWon || 0}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm text-destructive">
                                    {stats.legsLost || 0}
                                  </td>
                                  <td className={cn(
                                    "text-center px-2 py-2 text-sm font-bold",
                                    legDifference > 0 && "text-[oklch(64%_0.2_132)]",
                                    legDifference < 0 && "text-destructive"
                                  )}>
                                    {legDifference > 0 ? '+' : ''}{legDifference}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm font-medium">
                                    {stats.average ? stats.average.toFixed(1) : (stats.avg ? stats.avg.toFixed(1) : '0.0')}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm">
                                    {stats.oneEightiesCount || 0}
                                  </td>
                                  <td className="text-center px-2 py-2 text-sm">
                                    {stats.highestCheckout || 0}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Matches Section */}
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMatches(group._id)}
                        className="w-full justify-between mb-4"
                      >
                        <span className="flex items-center gap-2">
                          <IconTarget className="h-4 w-4" />
                          Mérkőzések
                        </span>
                        <IconChevronDown className={cn("h-4 w-4 transition-transform duration-200", isMatchesExpanded && "rotate-180")} />
                      </Button>

                      {isMatchesExpanded && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`filter-${group._id}`} className="text-sm">Szűrés:</Label>
                            <select
                              id={`filter-${group._id}`}
                              className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={matchFilter}
                              onChange={(e) => setMatchFilter(e.target.value as 'all' | 'pending' | 'ongoing' | 'finished')}
                            >
                              <option value="all">Összes</option>
                              <option value="pending">Függőben</option>
                              <option value="ongoing">Folyamatban</option>
                              <option value="finished">Befejezve</option>
                            </select>
                          </div>

                          {group.matches && group.matches.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                  <tr>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">#</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Játékosok</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Pontozó</th>
                                    <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Állapot</th>
                                    <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Átlag</th>
                                    <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Eredmény</th>
                                    <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Műveletek</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                  {group.matches
                                    .filter((match: Match) =>
                                      matchFilter === 'all' ? true : match.status === matchFilter
                                    )
                                    .map((match: Match, matchIndex: number) => (
                                    <tr key={match._id} className="hover:bg-muted/20 transition-colors">
                                      <td className="text-center px-3 py-2 font-bold text-xs">
                                        {matchIndex + 1}.
                                      </td>
                                      <td className="px-3 py-2 font-semibold text-sm">
                                        {match.player1?.playerId?.name || 'Ismeretlen'} vs {match.player2?.playerId?.name || 'Ismeretlen'}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-muted-foreground">
                                        {match.scorer?.name || 'Nincs'}
                                      </td>
                                      <td className="text-center px-2 py-2">
                                        {getStatusBadge(match.status)}
                                      </td>
                                      <td className="text-center px-2 py-2 text-sm">
                                        {match.stats?.player1?.average && match.stats?.player2?.average ? (
                                          <span>
                                            {match.stats.player1.average.toFixed(1)} - {match.stats.player2.average.toFixed(1)}
                                          </span>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="text-center px-2 py-2">
                                        {(match.status === 'finished' || match.status === 'ongoing') ? (
                                          <Badge variant="outline" className="font-semibold">
                                            {match.player1.legsWon} - {match.player2.legsWon}
                                          </Badge>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="text-center px-2 py-2">
                                        <div className="flex items-center justify-center gap-1">
                                          {(match.status === 'ongoing' || match.status === 'finished') && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleViewLegs(match)}
                                              className="h-8 px-2"
                                            >
                                              <IconEye className="h-4 w-4" />
                                            </Button>
                                          )}
                                          {isAdminOrModerator && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleEditMatch(match)}
                                              className="h-8 px-2"
                                            >
                                              <IconEdit className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Card className="bg-muted/20">
                              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                                Nincsenek mérkőzések a csoportban.
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Admin Modal */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Meccs Szerkesztése</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <>
                  {selectedMatch.player1?.playerId?.name} vs {selectedMatch.player2?.playerId?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedMatch && (
            <div className="overflow-y-auto flex-1 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player 1 Stats */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-lg text-primary">{selectedMatch.player1?.playerId?.name}</h5>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player1-legs">Nyert legek:</Label>
                    <Input
                      id="player1-legs"
                      type="number"
                      min={0}
                      max={10}
                      value={player1Legs ?? ''}
                      onChange={(e) => setPlayer1Legs(e.target.value === '' ? '' : parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player1-180s">180-ak száma:</Label>
                    <Input
                      id="player1-180s"
                      type="number"
                      min={0}
                      max={50}
                      value={player1Stats.oneEightiesCount ?? ''}
                      onChange={(e) => setPlayer1Stats(prev => ({
                        ...prev,
                        oneEightiesCount: e.target.value === '' ? '' : parseInt(e.target.value)
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player1-hc">Legmagasabb kiszálló:</Label>
                    <Input
                      id="player1-hc"
                      type="number"
                      min={0}
                      max={170}
                      value={player1Stats.highestCheckout ?? ''}
                      onChange={(e) => setPlayer1Stats(prev => ({
                        ...prev,
                        highestCheckout: e.target.value === '' ? '' : parseInt(e.target.value)
                      }))}
                    />
                  </div>
                </div>

                {/* Player 2 Stats */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-lg text-primary">{selectedMatch.player2?.playerId?.name}</h5>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player2-legs">Nyert legek:</Label>
                    <Input
                      id="player2-legs"
                      type="number"
                      min={0}
                      max={10}
                      value={player2Legs ?? ''}
                      onChange={(e) => setPlayer2Legs(e.target.value === '' ? '' : parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player2-180s">180-ak száma:</Label>
                    <Input
                      id="player2-180s"
                      type="number"
                      min={0}
                      max={50}
                      value={player2Stats.oneEightiesCount ?? ''}
                      onChange={(e) => setPlayer2Stats(prev => ({
                        ...prev,
                        oneEightiesCount: e.target.value === '' ? '' : parseInt(e.target.value)
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player2-hc">Legmagasabb kiszálló:</Label>
                    <Input
                      id="player2-hc"
                      type="number"
                      min={0}
                      max={170}
                      value={player2Stats.highestCheckout ?? ''}
                      onChange={(e) => setPlayer2Stats(prev => ({
                        ...prev,
                        highestCheckout: e.target.value === '' ? '' : parseInt(e.target.value)
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdminModal(false)
                setSelectedMatch(null)
                setError('')
              }}
            >
              Mégse
            </Button>
            <Button
              variant="default"
              onClick={handleSaveMatch}
              disabled={loading || player1Legs === player2Legs}
            >
              {loading ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legs View Modal */}
      <LegsViewModal
        isOpen={showLegsModal}
        onClose={() => {
          setShowLegsModal(false)
          setSelectedMatchForLegs(null)
        }}
        match={selectedMatchForLegs}
      />
    </div>
  )
}

export default TournamentGroupsView
