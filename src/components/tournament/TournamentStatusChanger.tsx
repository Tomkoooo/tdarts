import React, { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import axios from "axios"
import {
  CreateManualGroupsRequest,
  ManualGroupsAvailablePlayer,
  ManualGroupsContextResponse,
  Tournament,
} from "@/interface/tournament.interface"

import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { showErrorToast } from "@/lib/toastUtils"

interface TournamentStatusManagerProps {
  tournament: Tournament
  userClubRole: "admin" | "moderator" | "member" | "none"
  onRefetch: () => void
}

type KnockoutMode = "automatic" | "manual"
type GroupsMode = "automatic" | "manual"
type PendingAction =
  | "generate-groups"
  | "generate-knockout"
  | "finish"
  | "cancel-knockout"
  | "manual-groups"
  | null

const MIN_PLAYERS_PER_GROUP = 3
const MAX_PLAYERS_PER_GROUP = 6

export default function TournamentStatusChanger({
  tournament,
  userClubRole,
  onRefetch,
}: TournamentStatusManagerProps) {
  const t = useTranslations()
  const [action, setAction] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)

  const [isGroupsDialogOpen, setIsGroupsDialogOpen] = useState(false)
  const [isManualGroupsDialogOpen, setIsManualGroupsDialogOpen] = useState(false)
  const [isKnockoutDialogOpen, setIsKnockoutDialogOpen] = useState(false)
  const [isCancelKnockoutDialogOpen, setIsCancelKnockoutDialogOpen] = useState(false)
  const [isThirdPlaceDialogOpen, setIsThirdPlaceDialogOpen] = useState(false)
  const [selectedThirdPlaceId, setSelectedThirdPlaceId] = useState<string | null>(null)

  const [knockoutMode, setKnockoutMode] = useState<KnockoutMode>("automatic")
  const [groupsMode, setGroupsMode] = useState<GroupsMode>("automatic")
  const [selectedPlayers, setSelectedPlayers] = useState(8)

  const [manualContext, setManualContext] = useState<(ManualGroupsContextResponse & { searchQuery: string }) | null>(null)
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null)
  const [boardAssignments, setBoardAssignments] = useState<Record<number, string[]>>({})

  const tournamentCode = tournament?.tournamentId
  const tournamentStatus = tournament?.tournamentSettings?.status
  const tournamentFormat = tournament?.tournamentSettings?.format || "group_knockout"
  const totalPlayers = tournament?.tournamentPlayers?.length ?? 0

  const checkedInPlayers = useMemo(
    () => tournament?.tournamentPlayers?.filter((player) => player.status === "checked-in") ?? [],
    [tournament?.tournamentPlayers],
  )
  const availablePlayers = checkedInPlayers.length
  const boardCount = tournament?.tournamentSettings?.boardCount ?? 0

  const minPlayersRequired = boardCount * MIN_PLAYERS_PER_GROUP
  const maxPlayersAllowed = boardCount * MAX_PLAYERS_PER_GROUP

  const isGroupGenerationAllowed =
    boardCount > 0 && availablePlayers >= minPlayersRequired && availablePlayers <= maxPlayersAllowed

  const isAutomaticKnockoutAllowed =
    boardCount === 0 ||
    tournamentFormat === "knockout" ||
    (tournamentFormat === "group_knockout" && [2, 4, 8, 16].includes(boardCount))

  const resetError = () => setError(null)

  const handleApiRequest = useCallback(
    async (pendingAction: PendingAction, request: () => Promise<void>) => {
      setAction(pendingAction)
      setError(null)

      try {
        await request()
        onRefetch()
      } catch (err: any) {
        const message = err?.response?.data?.error || err?.message || t('Tournament.status_changer.error_unknown')
        setError(message)
        showErrorToast(message, {
          error: err?.response?.data?.details || err?.message,
          context: `Action: ${pendingAction}`,
          errorName: "Tournament Status Change Error"
        })
      } finally {
        setAction(null)
      }
    },
    [onRefetch],
  )

  const handleOpenGroupsDialog = () => {
    resetError()
    setIsGroupsDialogOpen(true)
  }

  const handleAutomaticGroups = () => {
    handleApiRequest("generate-groups", async () => {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateGroups`)
      if (!response?.data || response.status !== 200) {
        throw new Error(response?.data?.error || t('Tournament.status_changer.error_groups_generate'))
      }
      setIsGroupsDialogOpen(false)
    })
  }

  const handleLoadManualContext = () => {
    handleApiRequest("manual-groups", async () => {
      const { data } = await axios.get(`/api/tournaments/${tournamentCode}/manualGroups/context`)
      if (!data?.success) {
        throw new Error(data?.error || t('Tournament.status_changer.manual_groups_dialog.error_load'))
      }

      const availableBoards = (data.boards || []).filter((board: { isUsed: boolean }) => !board.isUsed)
      const defaultBoard = availableBoards.length > 0 ? availableBoards[0].boardNumber : null

      setManualContext({
        ...data,
        searchQuery: "",
      })
      setSelectedBoard(defaultBoard)
      setBoardAssignments({})
      setIsGroupsDialogOpen(false)
      setIsManualGroupsDialogOpen(true)
    })
  }

  const handleCreateManualGroups = () => {
    const payloadGroups = Object.entries(boardAssignments)
      .map(([boardNumber, playerIds]) => ({ boardNumber: parseInt(boardNumber, 10), playerIds }))
      .filter((group) => group.playerIds.length >= MIN_PLAYERS_PER_GROUP && group.playerIds.length <= MAX_PLAYERS_PER_GROUP)

    if (payloadGroups.length === 0) {
      setError(t('Tournament.status_changer.manual_groups_dialog.error_no_valid_groups'))
      return
    }

    const payload: CreateManualGroupsRequest = {
      groups: payloadGroups,
    }

    handleApiRequest("generate-groups", async () => {
      const { data } = await axios.post(`/api/tournaments/${tournamentCode}/manualGroups/create`, payload)
      if (!data?.success) {
        throw new Error(data?.error || t('Tournament.status_changer.manual_groups_dialog.error_create'))
      }

      setIsManualGroupsDialogOpen(false)
      setManualContext(null)
      setBoardAssignments({})
      setSelectedBoard(null)
    })
  }

  const handleGenerateKnockout = () => {
    handleApiRequest("generate-knockout", async () => {
      let response

      if (tournamentFormat === "knockout") {
        if (knockoutMode === "automatic") {
          response = await axios.post(`/api/tournaments/${tournamentCode}/generateKnockout`, {
            useSeededPlayers: false,
            seededPlayersCount: 0,
          })
        } else {
          response = await axios.post(`/api/tournaments/${tournamentCode}/generateManualKnockout`)
        }
      } else {
        if (knockoutMode === "automatic") {
          response = await axios.post(`/api/tournaments/${tournamentCode}/generateKnockout`, {
            qualifiersPerGroup: selectedPlayers,
            useSeededPlayers: false,
            seededPlayersCount: 0,
          })
        } else {
          response = await axios.post(`/api/tournaments/${tournamentCode}/generateManualKnockout`)
        }
      }

      if (!response?.data?.success) {
        throw new Error(response?.data?.error || t('Tournament.status_changer.knockout_dialog.error_generate'))
      }

      setIsKnockoutDialogOpen(false)
    })
  }

  const semiFinalLosers = useMemo(() => {
    if (!tournament?.knockout || tournament.knockout.length < 2) return []

    // Semi-final is the round before the final
    const semiFinalRound = tournament.knockout[tournament.knockout.length - 2]
    const losers: Array<{ _id: string; name: string }> = []

    semiFinalRound.matches.forEach((match: any) => {
      const matchRef = match.matchReference
      // Ensure match is finished and has both players (not a bye)
      if (matchRef && matchRef.winnerId && match.player1 && match.player2) {
        const winnerId = matchRef.winnerId.toString()
        const p1Id = (match.player1 as any)._id?.toString() || match.player1?.toString()
        const p2Id = (match.player2 as any)._id?.toString() || match.player2?.toString()
        const loserId = p1Id === winnerId ? p2Id : p1Id

        const player = tournament.tournamentPlayers.find((tp) => {
          const tpId = (tp.playerReference as any)?._id?.toString() || tp.playerReference?.toString()
          return tpId === loserId
        })

        if (player) {
          losers.push({
            _id: loserId,
            name: (player.playerReference as any)?.name || t('Tournament.groups.table.unknown'),
          })
        }
      }
    })

    return losers
  }, [tournament])

  const handleFinishTournament = (thirdPlaceId?: string) => {
    // If not already showing the third place dialog and we have semi-final losers
    if (!isThirdPlaceDialogOpen && semiFinalLosers.length === 2 && !thirdPlaceId) {
      setIsThirdPlaceDialogOpen(true)
      return
    }

    handleApiRequest("finish", async () => {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/finish`, {
        thirdPlacePlayerId: thirdPlaceId,
      })
      if (!response?.data?.success) {
        throw new Error(response?.data?.error || t('Tournament.status_changer.third_place_dialog.error'))
      }
      setIsThirdPlaceDialogOpen(false)
    })
  }

  const handleCancelKnockout = () => {
    handleApiRequest("cancel-knockout", async () => {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/cancel-knockout`)
      if (!response?.data?.success) {
        throw new Error(response?.data?.error || t('Tournament.status_changer.cancel_knockout_dialog.error'))
      }
      setIsCancelKnockoutDialogOpen(false)
    })
  }

  const handleTogglePlayer = (playerId: string, checked: boolean) => {
    if (!selectedBoard) return

    setBoardAssignments((prev) => {
      const current = prev[selectedBoard] || []

      if (checked) {
        if (current.includes(playerId) || current.length >= MAX_PLAYERS_PER_GROUP) {
          return prev
        }
        return {
          ...prev,
          [selectedBoard]: [...current, playerId],
        }
      }

      return {
        ...prev,
        [selectedBoard]: current.filter((id) => id !== playerId),
      }
    })
  }

  const assignedPlayers = useMemo(() => {
    const entries = Object.entries(boardAssignments)
    const result = new Map<number, string[]>()

    entries.forEach(([boardNumber, playerIds]) => {
      result.set(Number(boardNumber), playerIds)
    })

    return result
  }, [boardAssignments])

  const filteredManualPlayers = useMemo(() => {
    if (!manualContext) return []

    const normalize = (value: string) =>
      (value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()

    const query = normalize(manualContext.searchQuery)
    const numericQuery = /^\d+$/.test(query)

    const players = manualContext.availablePlayers || []
    if (!selectedBoard) {
      return players
    }

    const assignedElsewhere = Array.from(assignedPlayers.entries())
      .filter(([boardNumber]) => boardNumber !== selectedBoard)
      .flatMap(([, ids]) => ids)

    return players.filter((player: ManualGroupsAvailablePlayer) => {
      if (assignedElsewhere.includes(player._id)) return false

      if (!query) return true

      const name = normalize(player.name || "")
      if (numericQuery) {
        const tokens = name.split(/[^a-z0-9]+/)
        return tokens.some((token) => token === query)
      }

      return name.includes(query)
    })
  }, [manualContext, assignedPlayers, selectedBoard])

  if (userClubRole !== "admin" && userClubRole !== "moderator") {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="bg-transparent">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-semibold">{t('Tournament.status_changer.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('Tournament.status_changer.description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tournamentStatus === "pending" &&
              (tournamentFormat === "group" || tournamentFormat === "group_knockout") && (
                <Button
                  variant="secondary"
                  className="flex-1 min-w-[200px]"
                  onClick={handleOpenGroupsDialog}
                  disabled={!isGroupGenerationAllowed}
                >
                  {t('Tournament.status_changer.btn_generate_groups')}
                </Button>
              )}

            {((tournamentStatus === "group-stage" &&
              (tournamentFormat === "knockout" || tournamentFormat === "group_knockout")) ||
              (tournamentStatus === "pending" && tournamentFormat === "knockout")) && (
              <Button
                className="flex-1 min-w-[200px]"
                onClick={() => {
                  resetError()
                  setIsKnockoutDialogOpen(true)
                }}
              >
                Egyenes kiesés generálása
              </Button>
            )}

            {tournamentStatus === "knockout" && (
              <Button
                variant="destructive"
                className="flex-1 min-w-[200px]"
                onClick={() => {
                  resetError()
                  setIsCancelKnockoutDialogOpen(true)
                }}
              >
                {t('Tournament.status_changer.btn_cancel_knockout')}
              </Button>
            )}

            {(tournamentStatus === "knockout" ||
              (tournamentStatus === "group-stage" && tournamentFormat === "group") ||
              (tournamentStatus === "pending" && tournamentFormat === "knockout")) && (
              <Button variant="outline" className="flex-1 min-w-[200px]" onClick={() => handleFinishTournament()}>
                {t('Tournament.status_changer.btn_finish')}
              </Button>
            )}
          </div>

          {!isGroupGenerationAllowed &&
            tournamentStatus === "pending" &&
            (tournamentFormat === "group" || tournamentFormat === "group_knockout") &&
            boardCount > 0 && (
              <Alert variant="warning">
                <AlertTitle>{t('Tournament.status_changer.alert_player_count_title')}</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    {t('Tournament.status_changer.alert_player_count_desc', { min: MIN_PLAYERS_PER_GROUP, max: MAX_PLAYERS_PER_GROUP })}
                  </p>
                  <p>
                    {t('Tournament.status_changer.alert_player_count_current', { available: availablePlayers, boards: boardCount, total: totalPlayers })}
                  </p>
                </AlertDescription>
              </Alert>
            )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>{t('Tournament.status_changer.alert_error_title')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </div>

      <Dialog open={isGroupsDialogOpen} onOpenChange={setIsGroupsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Tournament.status_changer.groups_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('Tournament.status_changer.groups_dialog.description')}
            </DialogDescription>
          </DialogHeader>

          {!isGroupGenerationAllowed && boardCount > 0 && (
            <Alert variant="warning">
              <AlertTitle>{t('Tournament.status_changer.groups_dialog.alert_check_title')}</AlertTitle>
              <AlertDescription>
                {t('Tournament.status_changer.groups_dialog.alert_check_desc', { boards: boardCount, min: minPlayersRequired, max: maxPlayersAllowed, available: availablePlayers })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-muted-foreground">{t('Tournament.status_changer.groups_dialog.mode_label')}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={groupsMode === "automatic" ? "default" : "outline"}
                onClick={() => setGroupsMode("automatic")}
              >
                {t('Tournament.status_changer.groups_dialog.automatic')}
              </Button>
              <Button
                type="button"
                variant={groupsMode === "manual" ? "default" : "outline"}
                onClick={() => setGroupsMode("manual")}
              >
                {t('Tournament.status_changer.groups_dialog.manual')}
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {groupsMode === "automatic" ? (
              <Button onClick={handleAutomaticGroups} disabled={!isGroupGenerationAllowed || action === "generate-groups"}>
                {action === "generate-groups" ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Generálás...
                  </span>
                ) : (
                  "Automatikus generálás"
                )}
              </Button>
            ) : (
              <Button onClick={handleLoadManualContext} disabled={!isGroupGenerationAllowed || action === "manual-groups"}>
                {action === "manual-groups" ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Betöltés...
                  </span>
                ) : (
                  "Manuális kiosztás"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualGroupsDialogOpen} onOpenChange={setIsManualGroupsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('Tournament.status_changer.manual_groups_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('Tournament.status_changer.manual_groups_dialog.description')}
            </DialogDescription>
          </DialogHeader>

          {manualContext && (
            <div className="flex-1 overflow-y-auto px-1">
            <div className="grid gap-6 md:grid-cols-[260px_1fr]">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('Tournament.status_changer.manual_groups_dialog.boards_title')}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t('Tournament.status_changer.manual_groups_dialog.boards_desc')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {manualContext.boards.map((board) => {
                      const assignedCount = assignedPlayers.get(board.boardNumber)?.length ?? 0
                      const isActive = selectedBoard === board.boardNumber

                      return (
                        <Button
                          key={board.boardNumber}
                          variant={isActive ? "default" : "outline"}
                          className="w-full justify-between"
                          disabled={board.isUsed}
                          onClick={() => {
                            setSelectedBoard(board.boardNumber)
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {t('Tournament.status_changer.manual_groups_dialog.board_number', { number: board.boardNumber })}
                            {board.isUsed && <Badge variant="secondary">{t('Tournament.status_changer.manual_groups_dialog.board_occupied')}</Badge>}
                          </span>
                          <Badge variant={assignedCount ? "default" : "secondary"}>{t('Tournament.status_changer.manual_groups_dialog.board_player_count', { count: assignedCount })}</Badge>
                        </Button>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t('Tournament.status_changer.manual_groups_dialog.players_label')}</h3>
                    {selectedBoard && (
                      <Badge variant="outline">{t('Tournament.status_changer.manual_groups_dialog.active_board', { number: selectedBoard })}</Badge>
                    )}
                  </div>
                  <Input
                    placeholder={t('Tournament.status_changer.manual_groups_dialog.search_placeholder')}
                    value={manualContext.searchQuery}
                    onChange={(event) =>
                      setManualContext((prev) => (prev ? { ...prev, searchQuery: event.target.value } : prev))
                    }
                  />
                </div>

                <div className="rounded-lg border bg-muted/40 p-3">
                  {selectedBoard ? (
                    <div className="space-y-3">
                      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                        {filteredManualPlayers.map((player) => {
                          const assignedToCurrentBoard = assignedPlayers.get(selectedBoard) || []
                          const checked = assignedToCurrentBoard.includes(player._id)
                          const isBoardFull = assignedToCurrentBoard.length >= MAX_PLAYERS_PER_GROUP

                          return (
                            <label
                              key={player._id}
                              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{player.name || player._id}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => handleTogglePlayer(player._id, event.target.checked)}
                                disabled={!checked && isBoardFull}
                                className="h-4 w-4"
                              />
                            </label>
                          )
                        })}

                        {filteredManualPlayers.length === 0 && (
                          <div className="rounded-md border border-dashed bg-background/60 p-6 text-center text-sm text-muted-foreground">
                            {t('Tournament.status_changer.manual_groups_dialog.no_players')}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">{t('Tournament.status_changer.manual_groups_dialog.summary_title')}</h4>
                        <div className="rounded-md border bg-background px-3 py-2 text-sm">
                          {Array.from(assignedPlayers.entries())
                            .filter(([, ids]) => ids.length > 0)
                            .map(([boardNumber, playerIds]) => (
                              <div key={boardNumber} className="flex flex-wrap gap-1">
                                <span className="font-medium">{t('Tournament.status_changer.manual_groups_dialog.summary_board', { number: boardNumber })}</span>
                                <span>
                                  {playerIds
                                    .map((playerId) => {
                                      const player = manualContext.availablePlayers.find((item) => item._id === playerId)
                                      return player?.name || playerId
                                    })
                                    .join(", ")}
                                </span>
                              </div>
                            ))}

                          {Array.from(assignedPlayers.values()).every((ids) => ids.length === 0) && (
                            <p className="text-muted-foreground">{t('Tournament.status_changer.manual_groups_dialog.no_players_selected')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed bg-background/60 p-6 text-center text-sm text-muted-foreground">
                      {t('Tournament.status_changer.manual_groups_dialog.select_board_first')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}

          {!manualContext && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <p>{t('Tournament.status_changer.manual_groups_dialog.loading_context')}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              onClick={handleCreateManualGroups}
              disabled={
                action === "generate-groups" || (manualContext?.boards?.every((board) => board.isUsed) ?? false)
              }
            >
              {action === "generate-groups" ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t('Tournament.status_changer.manual_groups_dialog.saving')}
                </span>
              ) : (
                t('Tournament.status_changer.manual_groups_dialog.btn_create')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isKnockoutDialogOpen} onOpenChange={setIsKnockoutDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Tournament.status_changer.knockout_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('Tournament.status_changer.knockout_dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-muted-foreground">{t('Tournament.status_changer.knockout_dialog.mode_label')}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={knockoutMode === "automatic" ? "default" : "outline"}
                  onClick={() => setKnockoutMode("automatic")}
                >
                  {t('Tournament.status_changer.knockout_dialog.automatic')}
                </Button>
                <Button
                  type="button"
                  variant={knockoutMode === "manual" ? "default" : "outline"}
                  onClick={() => setKnockoutMode("manual")}
                >
                  {t('Tournament.status_changer.knockout_dialog.manual')}
                </Button>
              </div>
            </div>

            {knockoutMode === "automatic" && !isAutomaticKnockoutAllowed && (
              <Alert variant="destructive">
                <AlertTitle>{t('Tournament.status_changer.knockout_dialog.alert_unsupported_title')}</AlertTitle>
                <AlertDescription>
                  {t('Tournament.status_changer.knockout_dialog.alert_unsupported_desc')}
                </AlertDescription>
              </Alert>
            )}

              {knockoutMode === "automatic" && isAutomaticKnockoutAllowed && tournamentFormat !== "knockout" && (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-muted-foreground">{t('Tournament.status_changer.knockout_dialog.qualifiers_label')}</span>
                  <p className="text-xs text-muted-foreground">
                    {t('Tournament.status_changer.knockout_dialog.qualifiers_desc')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].filter(count => !(boardCount >= 16 && count === 4)).map((count) => (
                      <Button
                        key={count}
                        type="button"
                        variant={selectedPlayers === count ? "default" : "outline"}
                        onClick={() => setSelectedPlayers(count)}
                      >
                        {t('Tournament.status_changer.knockout_dialog.players_count', { count })}
                      </Button>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {t('Tournament.status_changer.knockout_dialog.bracket_size', { size: boardCount * selectedPlayers, boards: boardCount })}
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground mt-3 border border-border">
                    <p>
                      <strong>Megjegyzés:</strong> Az egyeneság az MDL egyeneság szabályai alapján generálódik automatikus módban. 
                      Ha más megközelítést szeretne, válassza a <em>Manuális</em> módot és vegye fel kézzel a meccseket.
                    </p>
                  </div>
                </div>
              )}

            {knockoutMode === "manual" && (
              <Alert>
                <AlertTitle>{t('Tournament.status_changer.knockout_dialog.alert_manual_title')}</AlertTitle>
                <AlertDescription>
                  {t('Tournament.status_changer.knockout_dialog.alert_manual_desc')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button onClick={handleGenerateKnockout} disabled={action === "generate-knockout" || (!isAutomaticKnockoutAllowed && knockoutMode === "automatic")}
            >
              {action === "generate-knockout" ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t('Tournament.status_changer.knockout_dialog.generating')}
                </span>
              ) : (
                t('Tournament.status_changer.knockout_dialog.btn_generate')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelKnockoutDialogOpen} onOpenChange={setIsCancelKnockoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Tournament.status_changer.cancel_knockout_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('Tournament.status_changer.cancel_knockout_dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="destructive" onClick={handleCancelKnockout} disabled={action === "cancel-knockout"}>
              {action === "cancel-knockout" ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t('Tournament.status_changer.cancel_knockout_dialog.cancelling')}
                </span>
              ) : (
                t('Tournament.status_changer.cancel_knockout_dialog.btn_cancel')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isThirdPlaceDialogOpen} onOpenChange={setIsThirdPlaceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Tournament.status_changer.third_place_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('Tournament.status_changer.third_place_dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              {semiFinalLosers.map((player) => (
                <Button
                  key={player._id}
                  variant={selectedThirdPlaceId === player._id ? "default" : "outline"}
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => setSelectedThirdPlaceId(player._id)}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{t('Tournament.status_changer.third_place_dialog.mark_third')}</span>
                  </div>
                </Button>
              ))}
              <Button
                variant={selectedThirdPlaceId === null ? "default" : "outline"}
                className="justify-start text-left h-auto py-3 px-4"
                onClick={() => setSelectedThirdPlaceId(null)}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{t('Tournament.status_changer.third_place_dialog.no_difference')}</span>
                  <span className="text-xs text-muted-foreground">{t('Tournament.status_changer.third_place_dialog.both_fourth')}</span>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setIsThirdPlaceDialogOpen(false)}>
              {t('Tournament.status_changer.third_place_dialog.btn_cancel')}
            </Button>
            <Button
              onClick={() => handleFinishTournament(selectedThirdPlaceId || undefined)}
              disabled={action === "finish"}
            >
              {action === "finish" ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t('Tournament.status_changer.third_place_dialog.finishing')}
                </span>
              ) : (
                t('Tournament.status_changer.third_place_dialog.btn_finish')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
