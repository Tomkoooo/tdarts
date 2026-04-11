import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/Button"
import { IconDeviceDesktop, IconSettings } from "@tabler/icons-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { showErrorToast } from "@/lib/toastUtils"
import toast from "react-hot-toast"
import { updateTournamentBoardAction } from "@/features/tournaments/actions/manageTournament.action"
import type { BoardsDataSyncSource } from "@/features/tournament/hooks/useTournamentPageData"
import { useRelativeTimeAgo } from "@/lib/time/useRelativeTimeAgo"

interface TournamentBoardsViewProps {
  tournament: any
  userClubRole?: 'admin' | 'moderator' | 'member' | 'none'
  dataSyncedAt?: number | null
  dataSyncSource?: BoardsDataSyncSource | null
}



const getPlayerName = (player: any) => player?.playerId?.name || player?.name || "N/A"

/**
 * Populated Player ref, plain id string, or unassigned — used for always-visible scorer lines.
 * Uses `scorerSource` when the Player ref is not populated (same idea as TV group display).
 */
function resolveScorerDisplayName(match: any, tTour: (key: string) => string): string {
  const sc = match?.scorer
  if (sc != null && typeof sc === "object") {
    const n = typeof sc.name === "string" ? sc.name.trim() : ""
    if (n) return n
  }
  if (typeof sc === "string") {
    const trimmed = sc.trim()
    if (trimmed) return trimmed
  }
  const srcType = match?.scorerSource?.type as string | undefined
  if (srcType === "match_loser") return tTour("boards_view.scorer_previous_loser")
  if (srcType === "group_loser") return tTour("boards_view.scorer_group_loser")
  if (srcType === "manual") return tTour("boards_view.scorer_tbd")
  return tTour("boards_view.scorer_unknown")
}
const LEGACY_DEFAULT_BOARD_NAME_KEYS = new Set([
  "Club.create_tournament_modal.boards.default_board_name",
  "create_tournament_modal.boards.default_board_name",
  "boards.default_board_name",
]);

const unwrapMatch = (matchRef: any) => {
  if (!matchRef) return null;
  if (matchRef?.matchReference) return matchRef.matchReference;
  return matchRef;
};

const matchBelongsToBoard = (matchRef: any, boardNumber: number) =>
  Number(matchRef?.boardReference) === Number(boardNumber);

const getBoardFallbackCurrentMatch = (tournament: any, boardNumber: number) => {
  const groups = Array.isArray(tournament?.groups) ? tournament.groups : [];
  for (const group of groups) {
    const matches = Array.isArray(group?.matches) ? group.matches : [];
    const ongoing = matches
      .map(unwrapMatch)
      .find((match: any) => match?.status === "ongoing" && matchBelongsToBoard(match, boardNumber));
    if (ongoing) return ongoing;
  }

  const knockoutRounds = Array.isArray(tournament?.knockout) ? tournament.knockout : [];
  for (const round of knockoutRounds) {
    const matches = Array.isArray(round?.matches) ? round.matches : [];
    const ongoing = matches
      .map(unwrapMatch)
      .find((match: any) => match?.status === "ongoing" && matchBelongsToBoard(match, boardNumber));
    if (ongoing) return ongoing;
  }

  return null;
};

const getBoardFallbackNextMatch = (tournament: any, boardNumber: number) => {
  const groups = Array.isArray(tournament?.groups) ? tournament.groups : [];
  for (const group of groups) {
    const matches = Array.isArray(group?.matches) ? group.matches : [];
    const pending = matches
      .map(unwrapMatch)
      .find((match: any) => match?.status === "pending" && matchBelongsToBoard(match, boardNumber));
    if (pending) return pending;
    const ongoing = matches
      .map(unwrapMatch)
      .find((match: any) => match?.status === "ongoing" && matchBelongsToBoard(match, boardNumber));
    if (ongoing) return ongoing;
  }

  const knockoutRounds = Array.isArray(tournament?.knockout) ? tournament.knockout : [];
  for (const round of knockoutRounds) {
    const matches = Array.isArray(round?.matches) ? round.matches : [];
    const pending = matches
      .map(unwrapMatch)
      .find((match: any) => match?.status === "pending" && matchBelongsToBoard(match, boardNumber));
    if (pending) return pending;
  }

  return null;
};

function countNonFinishedMatchesOnBoard(tournament: any, boardNumber: number): number {
  let n = 0;
  const groups = Array.isArray(tournament?.groups) ? tournament.groups : [];
  for (const group of groups) {
    const matches = Array.isArray(group?.matches) ? group.matches : [];
    for (const raw of matches) {
      const match = unwrapMatch(raw);
      if (!match || (match._id == null && !match.status)) continue;
      if (!matchBelongsToBoard(match, boardNumber)) continue;
      if (match.status && match.status !== "finished") n += 1;
    }
  }
  const knockoutRounds = Array.isArray(tournament?.knockout) ? tournament.knockout : [];
  for (const round of knockoutRounds) {
    const matches = Array.isArray(round?.matches) ? round.matches : [];
    for (const raw of matches) {
      const match = unwrapMatch(raw);
      if (!match || (match._id == null && !match.status)) continue;
      if (!matchBelongsToBoard(match, boardNumber)) continue;
      if (match.status && match.status !== "finished") n += 1;
    }
  }
  return n;
}

function syncSourceLabel(
  source: BoardsDataSyncSource | null | undefined,
  t: (key: string) => string
): string | null {
  if (!source) return null;
  switch (source) {
    case "initial":
      return t("boards_view.sync_source_initial");
    case "full_resync":
      return t("boards_view.sync_source_full_resync");
    case "lite_resync":
      return t("boards_view.sync_source_lite_resync");
    case "sse_delta":
      return t("boards_view.sync_source_sse_delta");
    default:
      return null;
  }
}

export function TournamentBoardsView({
  tournament: initialTournament,
  userClubRole,
  dataSyncedAt,
  dataSyncSource,
}: TournamentBoardsViewProps) {
  const tTour = useTranslations("Tournament");
  const boards = initialTournament?.boards || []
  const tournamentId = initialTournament?.tournamentId
  const tournamentPassword = initialTournament?.tournamentSettings?.password

  const tournamentUpdatedMs = initialTournament?.updatedAt
    ? new Date(initialTournament.updatedAt).getTime()
    : null;
  const usingClientBoardsSync = dataSyncedAt != null && Number.isFinite(dataSyncedAt);
  const clientSyncMs = usingClientBoardsSync ? Number(dataSyncedAt) : null;
  const referenceMs =
    clientSyncMs != null
      ? clientSyncMs
      : tournamentUpdatedMs != null && Number.isFinite(tournamentUpdatedMs)
        ? tournamentUpdatedMs
        : null;
  const relativeUpdated = useRelativeTimeAgo(referenceMs);
  const syncHint = usingClientBoardsSync
    ? syncSourceLabel(dataSyncSource ?? null, tTour)
    : null;

  const statusMap: Record<string, { label: string; badgeClass: string; description: string; cardClass: string; accentClass: string; scoreClass: string }> = {
    idle: {
      label: tTour('boards_view.status_idle_label'),
      badgeClass: "bg-muted/50 text-muted-foreground",
      description: tTour('boards_view.status_idle_desc'),
      cardClass: "bg-card/90",
      accentClass: "text-muted-foreground",
      scoreClass: "text-muted-foreground",
    },
    waiting: {
      label: tTour('boards_view.status_waiting_label'),
      badgeClass: "bg-warning/15 text-warning",
      description: tTour('boards_view.status_waiting_desc'),
      cardClass: "bg-gradient-to-br from-warning/10 via-card/90 to-card/95 ring-1 ring-warning/20",
      accentClass: "text-warning",
      scoreClass: "text-warning font-semibold",
    },
    playing: {
      label: tTour('boards_view.status_playing_label'),
      badgeClass: "bg-success/15 text-success",
      description: tTour('boards_view.status_playing_desc'),
      cardClass: "bg-gradient-to-br from-success/10 via-card/92 to-card ring-1 ring-success/25",
      accentClass: "text-success",
      scoreClass: "text-success font-bold",
    },
  }

  // Board Edit State
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', scoliaSerialNumber: '', scoliaAccessToken: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (board: any) => {
      setEditingBoard(board);
      setEditForm({ 
          name: LEGACY_DEFAULT_BOARD_NAME_KEYS.has((board.name || '').trim()) ? '' : (board.name || ''), 
          scoliaSerialNumber: board.scoliaSerialNumber || '', 
          scoliaAccessToken: board.scoliaAccessToken || '' 
      });
  };

  const handleSaveBoard = async () => {
      if (!editingBoard) return;
      setIsSaving(true);
      try {
          const response = await updateTournamentBoardAction({
            code: tournamentId,
            boardNumber: editingBoard.boardNumber,
            name: editForm.name,
            scoliaSerialNumber: editForm.scoliaSerialNumber,
            scoliaAccessToken: editForm.scoliaAccessToken,
          });
          if ((response as any)?.success) {
              toast.success(tTour('boards_view.toast_save_success'));
              setEditingBoard(null);
          }
      } catch (error: any) {
          console.error("Failed to save board settings:", error);
           showErrorToast(tTour('boards_view.toast_save_error'), {
            error: error?.response?.data?.error,
            context: tTour('boards_view.toast_save_error_context'),
            errorName: tTour('boards_view.toast_save_error_name'),
          });
      } finally {
          setIsSaving(false);
      }
  };

  const canEdit = userClubRole === 'admin' || userClubRole === 'moderator';
  const getDefaultBoardLabel = (boardNumber: number) =>
    tTour('boards_view.board_number', { number: boardNumber });
  const resolveBoardName = (board: any) => {
    const rawName = typeof board?.name === "string" ? board.name.trim() : "";
    if (!rawName || LEGACY_DEFAULT_BOARD_NAME_KEYS.has(rawName)) {
      return getDefaultBoardLabel(board.boardNumber);
    }
    return rawName;
  };

  if (boards.length === 0) {
    return (
      <Card className="bg-card/90 text-muted-foreground shadow-lg shadow-black/30">
        <CardContent className="py-12 text-center text-sm">
          {tTour('boards_view.no_boards')}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <div className="grid gap-4 md:grid-cols-2">
      {boards.map((board: any, idx: number) => {
        const statusKey = board.status || "idle"
        const statusInfo = statusMap[statusKey] || statusMap.idle

        const currentMatch = board.currentMatch || getBoardFallbackCurrentMatch(initialTournament, board.boardNumber)
        const nextMatch = board.nextMatch || getBoardFallbackNextMatch(initialTournament, board.boardNumber)
        const openMatchesOnBoard = countNonFinishedMatchesOnBoard(initialTournament, board.boardNumber)

        return (
          <Card
            key={board.boardNumber || idx}
            className={cn("shadow-md shadow-black/25 relative group", statusInfo.cardClass)}
          >
             {canEdit && (
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => handleEditClick(board)}
                 >
                     <IconSettings className="h-4 w-4" />
                 </Button>
             )}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 pr-8">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {resolveBoardName(board)}
                </CardTitle>
                <Badge variant="outline" className={statusInfo.badgeClass}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className={cn("text-xs", statusInfo.accentClass)}>{statusInfo.description}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {statusKey === "playing" && currentMatch ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs font-semibold uppercase tracking-wide", statusInfo.accentClass)}>
                      {tTour('boards_view.current_match')}
                    </p>
                    {typeof board.boardNumber === 'number' && (
                      <span className="font-mono text-xs text-muted-foreground">#{board.boardNumber}</span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    <span className="font-semibold">{getPlayerName(currentMatch.player1)}</span>
                    <span className="mx-1 text-muted-foreground">vs</span>
                    <span className="font-semibold">{getPlayerName(currentMatch.player2)}</span>
                  </p>
                  <p className={cn("font-mono text-sm", statusInfo.scoreClass)}>
                    {tTour('boards_view.score_label', { p1: currentMatch.player1?.legsWon ?? 0, p2: currentMatch.player2?.legsWon ?? 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tTour('boards_view.scorer_label', {
                      name: resolveScorerDisplayName(currentMatch, tTour),
                    })}
                  </p>
                </div>
              ) : statusKey === "waiting" && nextMatch ? (
                <div className="space-y-2">
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", statusInfo.accentClass)}>
                    {tTour('boards_view.next_match')}
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    <span>{getPlayerName(nextMatch.player1)}</span>
                    <span className="mx-1 text-muted-foreground">vs</span>
                    <span>{getPlayerName(nextMatch.player2)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tTour('boards_view.scorer_label', {
                      name: resolveScorerDisplayName(nextMatch, tTour),
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">{tTour('boards_view.no_match_info')}</p>
              )}

              <Separator className="my-2" />

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{tTour('boards_view.last_updated')}</p>
                  <p>{relativeUpdated ?? "–"}</p>
                  {syncHint ? (
                    <p className="text-[10px] text-muted-foreground/90 mt-0.5 leading-snug">{syncHint}</p>
                  ) : null}
                </div>
                <div>
                  {statusKey === "playing" ? (
                    nextMatch ? (
                      <>
                        <p className="font-medium text-foreground">{tTour("boards_view.next_match_footer")}</p>
                        <p className="text-foreground font-medium leading-snug">
                          <span>{getPlayerName(nextMatch.player1)}</span>
                          <span className="mx-1 text-muted-foreground">vs</span>
                          <span>{getPlayerName(nextMatch.player2)}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                          {tTour("boards_view.scorer_label", {
                            name: resolveScorerDisplayName(nextMatch, tTour),
                          })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-foreground">{tTour("boards_view.next_match_footer")}</p>
                        <p>{tTour("boards_view.next_match_none")}</p>
                      </>
                    )
                  ) : (
                    <>
                      <p className="font-medium text-foreground">{tTour("boards_view.matches_on_board")}</p>
                      <p>{openMatchesOnBoard}</p>
                    </>
                  )}
                </div>
              </div>

              {tournamentId && board.boardNumber && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    asChild
                  >
                    <Link
                      href={`/board/${tournamentId}?board=${board.boardNumber}${tournamentPassword ? `&password=${encodeURIComponent(tournamentPassword)}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconDeviceDesktop className="h-4 w-4" />
                      {tTour("boards_view.btn_open_board")}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
    
    <Dialog open={!!editingBoard} onOpenChange={(open) => !open && setEditingBoard(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>{tTour('boards_view.edit_dialog_title')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
                 <div className="space-y-2">
                     <Label>{tTour('boards_view.edit_board_name')}</Label>
                     <Input 
                        value={editForm.name} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                     />
                 </div>
                 <div className="space-y-2">
                     <Label>{tTour("boards_view.edit_scolia_serial")}</Label>
                     <Input 
                        value={editForm.scoliaSerialNumber} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, scoliaSerialNumber: e.target.value }))}
                        placeholder={tTour("boards_view.edit_scolia_serial_placeholder")}
                     />
                 </div>
                 <div className="space-y-2">
                     <Label>{tTour('boards_view.edit_scolia_token')}</Label>
                     <Input 
                        value={editForm.scoliaAccessToken} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, scoliaAccessToken: e.target.value }))}
                        type="password"
                        placeholder={tTour('boards_view.edit_token_placeholder')}
                     />
                 </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingBoard(null)}>{tTour('boards_view.btn_cancel')}</Button>
                <Button onClick={handleSaveBoard} disabled={isSaving}>{tTour('boards_view.btn_save')}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}

export default TournamentBoardsView 