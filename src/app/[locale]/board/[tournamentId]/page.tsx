"use client";
import { useTranslations } from "next-intl";

import React, { useState, useEffect, use, useRef } from "react";
import MatchGame from "@/components/board/MatchGame";
import LocalMatchGame from "@/components/board/LocalMatchGame";
import { useUserContext } from "@/hooks/useUser";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import { BoardAuthScreen } from "@/features/board/components/BoardAuthScreen";
import { BoardSelectionScreen } from "@/features/board/components/BoardSelectionScreen";
import { BoardMatchSetupScreen } from "@/features/board/components/BoardMatchSetupScreen";
import { getSelectedBoardKey, getTournamentPasswordKey } from "@/features/board/hooks/useBoardData";
import type { Board, Match, UserRole } from "@/features/board/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconRefresh,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { showErrorToast } from "@/lib/toastUtils";
import toast from "react-hot-toast";
import {
  finishBoardMatchAction,
  getBoardListAction,
  getBoardMatchesAction,
  getBoardTournamentAction,
  getBoardUserRoleAction,
  startBoardMatchAction,
  validateBoardPasswordAction,
} from "@/features/board/actions/boardPage.action";

interface BoardPageProps {
  params: Promise<{ tournamentId: string }>;
}

const LIVE_TOURNAMENT_STATUSES = new Set(['group-stage', 'knockout', 'ongoing', 'in_progress']);

const BoardPage: React.FC<BoardPageProps> = (props) => {
  const t = useTranslations("Board");
  const { tournamentId } = use(props.params);
  const { user } = useUserContext();
  
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tournamentData, setTournamentData] = useState<any>(null); // Add tournament data state
  const isRealtimeEnabled =
    isAuthenticated &&
    LIVE_TOURNAMENT_STATUSES.has(tournamentData?.tournamentSettings?.status);
  const { lastEvent } = useRealTimeUpdates({
    tournamentId,
    enabled: isRealtimeEnabled,
  });
  
  // Match setup state
  const [showMatchSetup, setShowMatchSetup] = useState<boolean>(false);
  const [legsToWin, setLegsToWin] = useState<number>(4);
  const [startingPlayer, setStartingPlayer] = useState<1 | 2>(1);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  // Admin modal state
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminMatch, setAdminMatch] = useState<Match | null>(null);
  const [player1Legs, setPlayer1Legs] = useState<number | ''>(0);
  const [player2Legs, setPlayer2Legs] = useState<number | ''>(0);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  // Local match state
  const [showLocalMatchSetup, setShowLocalMatchSetup] = useState<boolean>(false);
  const [localMatchLegsToWin, setLocalMatchLegsToWin] = useState<number>(3);
  const [localMatchStartingScore, setLocalMatchStartingScore] = useState<number>(501);
  const [localMatchActive, setLocalMatchActive] = useState<boolean>(false);
  const [localMatchId, setLocalMatchId] = useState<string>("");
  const sseRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const startingScoreOptions = [170, 201, 301, 401, 501, 601, 701];
  const getBoardLabel = (boardNumber: number, name?: string) =>
    name || t("tabla_sorszam", { number: boardNumber });

  // Check URL parameters for QR code authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPassword = urlParams.get('password');
      const urlBoard = urlParams.get('board');
      
      if (urlPassword) {
        setPassword(urlPassword);
        handlePasswordSubmit(urlPassword);
      }
      
      if (urlBoard) {
        const boardNum = parseInt(urlBoard);
        localStorage.setItem(getSelectedBoardKey(tournamentId), boardNum.toString());
      }
    }
  }, [tournamentId]);

  // Check for saved authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPassword = localStorage.getItem(getTournamentPasswordKey(tournamentId));
      if (savedPassword) {
        setPassword(savedPassword);
        handlePasswordSubmit(savedPassword);
      }
    }
  }, [tournamentId]);

  // Check for saved board selection
  useEffect(() => {
    if (isAuthenticated && boards.length > 0) {
      const savedBoardNum = localStorage.getItem(getSelectedBoardKey(tournamentId));
      if (savedBoardNum) {
        const boardNum = parseInt(savedBoardNum);
        const savedBoard = boards.find(b => b.boardNumber === boardNum);
        if (savedBoard) {
          setSelectedBoard(savedBoard);
        }
      }
    }
  }, [isAuthenticated, boards, tournamentId]);

  // Load matches when board is selected
  useEffect(() => {
    if (selectedBoard) {
      loadMatches();
    }
  }, [selectedBoard, tournamentId]);

  // Load user role when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserRole();
    }
  }, [isAuthenticated, tournamentId]);

  // Real-time updates via SSE
  useEffect(() => {
    if (lastEvent && isAuthenticated) {
      console.log('Board - Received SSE event:', lastEvent.type, lastEvent.data);

      const scheduleRefresh = (action: () => void) => {
        if (sseRefreshTimerRef.current) {
          clearTimeout(sseRefreshTimerRef.current);
        }
        // Merge bursts of events to avoid back-to-back expensive API calls.
        sseRefreshTimerRef.current = setTimeout(action, 300);
      };
      
      // Auto-refresh on relevant events
      if (lastEvent.type === 'tournament-update' || lastEvent.type === 'match-update') {
        // If viewing matches, reload them
        if (selectedBoard) {
          console.log('Board - Auto-refreshing matches due to SSE event');
          scheduleRefresh(() => {
            void loadMatches();
          });
        } else {
          // If on board selection, reload boards
          console.log('Board - Auto-refreshing boards due to SSE event');
          scheduleRefresh(() => {
            void loadBoards();
          });
        }
      }
    }
  }, [lastEvent, isAuthenticated, selectedBoard]);

  useEffect(() => {
    return () => {
      if (sseRefreshTimerRef.current) {
        clearTimeout(sseRefreshTimerRef.current);
      }
    };
  }, []);

  const handlePasswordSubmit = async (pwd?: string) => {
    setLoading(true);
    setError("");
    
    try {
      const pwdToUse = pwd || password;
      const response = await validateBoardPasswordAction({
        tournamentId,
        password: pwdToUse,
      });
      
      if (response && typeof response === 'object' && 'isValid' in response && response.isValid) {
        setIsAuthenticated(true);
        localStorage.setItem(getTournamentPasswordKey(tournamentId), pwdToUse);
        
        // Load tournament data to get clubId
        try {
          const tournamentResponse = await getBoardTournamentAction({ tournamentId });
          setTournamentData(tournamentResponse);
        } catch (err: any) {
          console.error('Failed to load tournament data:', err);
          showErrorToast(t("nem_sikerült_betölteni_34"), {
            error: err?.response?.data?.error,
            context: 'Torna adatok betöltése',
            errorName: 'Torna adatok betöltése sikertelen',
          });
        }
        
        await loadBoards();
      } else {
        toast.error(t("hibás_jelszó"));
      }
    } catch (err: any) {
      setError(t("hiba_tortent_a_bejelentkezes_i7x8"));
      showErrorToast(t("nem_sikerült_bejelentkezni"), {
        error: err?.response?.data?.error,
        context: 'Tábla bejelentkezés',
        errorName: 'Bejelentkezés sikertelen',
      });
      console.error('Password submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoards = async () => {
    setLoading(true);
    try {
      const response = await getBoardListAction({ tournamentId });
      if (response && typeof response === 'object' && 'boards' in response) {
        setBoards((response as { boards: Board[] }).boards || []);
      } else {
        setBoards([]);
      }
    } catch (err: any) {
      setError(t("nem_sikerult_betolteni_a_px4t"));
      showErrorToast(t("nem_sikerült_betölteni_72"), {
        error: err?.response?.data?.error,
        context: 'Táblák betöltése',
        errorName: 'Táblák betöltése sikertelen',
      });
      console.error('Load boards error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    if (!selectedBoard) return;
    
    setLoading(true);
    try {
      const response = await getBoardMatchesAction({
        tournamentId,
        boardNumber: Number(selectedBoard.boardNumber),
      });
      if (response && typeof response === 'object' && 'matches' in response) {
        const nextMatches = ((response as { matches?: unknown }).matches || []) as unknown as Match[];
        setMatches(nextMatches);
      } else {
        setMatches([]);
      }
    } catch (err: any) {
      setError(t("nem_sikerult_betolteni_a_qh0h"));
      showErrorToast(t("nem_sikerült_betölteni_13"), {
        error: err?.response?.data?.error,
        context: 'Meccsek betöltése',
        errorName: 'Meccsek betöltése sikertelen',
      });
      console.error('Load matches error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRole = async () => {
    try {
      const response = await getBoardUserRoleAction({ tournamentId });
      setUserRole(response as UserRole);
    } catch (err) {
      console.error('Failed to load user role:', err);
    }
  };

  const handleMatchSelect = (match: Match) => {
    if (match.status === 'pending') {
      setSelectedMatch(match);
      setShowMatchSetup(true);
    } else if (match.status === 'ongoing') {
      setSelectedMatch(match);
    }
  };

  const handleAdminMatchFinish = async () => {
    if (!adminMatch) return;
    
    // Convert empty strings to 0
    const cleanedPlayer1Legs = player1Legs === '' ? 0 : Number(player1Legs);
    const cleanedPlayer2Legs = player2Legs === '' ? 0 : Number(player2Legs);
    
    // Ensure no tie
    if (cleanedPlayer1Legs === cleanedPlayer2Legs) {
      setError(t("nem_lehet_dontetlen_egyik_u0zf"));
      return;
    }
    
    setAdminLoading(true);
    setError("");
    
    try {
      await finishBoardMatchAction({
        matchId: String(adminMatch._id),
        player1LegsWon: cleanedPlayer1Legs,
        player2LegsWon: cleanedPlayer2Legs,
        player1Stats: {
          highestCheckout: adminMatch.player1.highestCheckout || 0,
          oneEightiesCount: adminMatch.player1.oneEightiesCount || 0,
          average: 0,
        },
        player2Stats: {
          highestCheckout: adminMatch.player2.highestCheckout || 0,
          oneEightiesCount: adminMatch.player2.oneEightiesCount || 0,
          average: 0,
        }
      });
      
      setShowAdminModal(false);
      setAdminMatch(null);
      setPlayer1Legs(0);
      setPlayer2Legs(0);
      await loadMatches(); // Reload matches to see updated status
    } catch (err: any) {
      setError(t("hiba_tortent_a_meccs_9wjg"));
      showErrorToast(t("nem_sikerült_befejezni"), {
        error: err?.response?.data?.error,
        context: 'Meccs befejezése',
        errorName: 'Meccs befejezése sikertelen',
      });
      console.error('Finish match error:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!selectedMatch || !selectedBoard) return;
    
    setSetupLoading(true);
    try {
      // Start the match
      const response = await startBoardMatchAction({
        tournamentId,
        boardNumber: Number(selectedBoard.boardNumber),
        matchId: selectedMatch._id,
        legsToWin,
        startingPlayer,
      });
      
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        setShowMatchSetup(false);
        // Update selectedMatch with fresh data from the API response
        if ('match' in response && (response as { match?: Match }).match) {
          setSelectedMatch((response as { match: Match }).match);
        } else {
          // Fallback: reload matches to get updated status
          await loadMatches();
        }
        
        // Notify other clients that a match has started
        try {
          const { notifyMatchStarted } = await import('@/lib/socketApi');
          await notifyMatchStarted(selectedMatch._id, tournamentId, {
            matchId: selectedMatch._id,
            player1: selectedMatch.player1,
            player2: selectedMatch.player2,
            boardNumber: selectedBoard.boardNumber,
            legsToWin,
            startingPlayer
          });
        } catch (socketError) {
          console.warn('Failed to notify match start via socket:', socketError);
          // Don't fail the match start if socket notification fails
        }
      }
    } catch (err: any) {
      setError(t("nem_sikerult_elinditani_a_pgom"));
      showErrorToast(t("nem_sikerült_elindítani"), {
        error: err?.response?.data?.error,
        context: 'Meccs indítása',
        errorName: 'Meccs indítása sikertelen',
      });
      console.error('Start match error:', err);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
    setSelectedMatch(null);
    setShowMatchSetup(false);
    localStorage.setItem(getSelectedBoardKey(tournamentId), board.boardNumber.toString());
  };

  const handleBackToBoards = () => {
    setSelectedBoard(null);
    setSelectedMatch(null);
    setShowMatchSetup(false);
    setMatches([]);
    localStorage.removeItem(getSelectedBoardKey(tournamentId));
  };

  const handleBackToMatches = () => {
    setSelectedMatch(null);
    setShowMatchSetup(false);
  };

  const handleRefetchMatches = async () => {
    await loadMatches();
  };

  const isAdminOrModerator = userRole?.clubRole === 'admin' || userRole?.clubRole === 'moderator';

  const handleStartLocalMatch = () => {
    const matchId = `local_${Date.now()}`;
    setLocalMatchId(matchId);
    setLocalMatchActive(true);
    setShowLocalMatchSetup(false);
  };

  const handleRematch = () => {
    const matchId = `local_${Date.now()}`;
    setLocalMatchId(matchId);
    setLocalMatchActive(true);
  };

  // If local match is active, show LocalMatchGame
  if (localMatchActive) {
    return (
      <LocalMatchGame
        key={localMatchId}
        legsToWin={localMatchLegsToWin}
        startingScore={localMatchStartingScore}
        onBack={() => setLocalMatchActive(false)}
        onRematch={handleRematch}
      />
    );
  }


  if (!isAuthenticated) {
    return (
      <BoardAuthScreen
        tournamentId={tournamentId}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={() => handlePasswordSubmit()}
        loading={loading}
        error={error}
        backHref="/board"
        backLabel={t("vissza")}
        title={t("torna_jelszó")}
        description={t("add_meg_a")}
        passwordLabel={t("torna_jelszó_1")}
        passwordPlaceholder={t("torna_jelszó_31")}
        submitLabel={t("bejelentkezés")}
        tournamentPageLabel={t("torna_oldal")}
        tournamentPageHref={`/tournaments/${tournamentId}`}
      />
    );
  }

  if (!selectedBoard) {
    return (
      <>
        <BoardSelectionScreen
          boards={boards}
          loading={loading}
          error={error}
          getBoardLabel={getBoardLabel}
          onBoardSelect={handleBoardSelect}
          onLocalMatchClick={() => setShowLocalMatchSetup(true)}
          backHref="/board"
          backLabel={t("vissza")}
          tournamentPageHref={`/tournaments/${tournamentId}`}
          tournamentPageLabel={t("torna_oldal")}
          title={t("válassz_táblát")}
          subtitle={t("válaszd_ki_a")}
          selectLabel={t("kiválaszt")}
          playingLabel={t("jatekban_oj3d")}
          waitingLabel={t("varakozik_nvfk")}
          idleLabel={t("szabad_ttii")}
          localMatchLabel={t("helyi_meccs_indítása")}
        />
        <Dialog open={showLocalMatchSetup} onOpenChange={setShowLocalMatchSetup}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("helyi_meccs_beállítása")}</DialogTitle>
                <DialogDescription>
                  {t("állítsd_be_a")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="local-legsToWin-board" className="text-sm font-medium mb-2 block">
                    {t("nyert_legek_száma")}</Label>
                  <select 
                    id="local-legsToWin-board"
                    onChange={(e) => setLocalMatchLegsToWin(parseInt(e.target.value))} 
                    value={localMatchLegsToWin} 
                    className="select select-bordered w-full h-12"
                  >
                    {Array.from({ length: 20 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">{t("best_of")}{localMatchLegsToWin * 2 - 1}</p>
                </div>
                <div>
                  <Label htmlFor="local-startingScore-board" className="text-sm font-medium mb-2 block">
                    {t("kezdő_pontszám")}</Label>
                  <select 
                    id="local-startingScore-board"
                    onChange={(e) => setLocalMatchStartingScore(parseInt(e.target.value))} 
                    value={localMatchStartingScore} 
                    className="select select-bordered w-full h-12"
                  >
                    {startingScoreOptions.map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">{t("ebből_a_pontszámból")}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t("játékosok_92")}<span className="font-semibold">1</span> és <span className="font-semibold">2</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("a_játékos_mindig")}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowLocalMatchSetup(false)}>
                    {t("mégse")}</Button>
                  <Button className="flex-1" onClick={handleStartLocalMatch}>
                    {t("meccs_indítása")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
      </>
    );
  }

  // Match selection screen
  if (!selectedMatch) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-background via-background/95 to-muted/40 p-4">
        <div className="container mx-auto max-w-6xl py-8">
          <div className="flex flex-col gap-4 mb-6">
            {/* Top row: Back button and title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleBackToBoards} className="gap-2 w-full sm:w-auto">
              <IconArrowLeft size={18} />
              {t("vissza_a_táblákhoz")}</Button>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl font-bold">
                {getBoardLabel(selectedBoard.boardNumber, selectedBoard.name)}
              </h1>
                <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefetchMatches}
                disabled={loading}
                className="gap-2"
              >
                <IconRefresh size={18} />
                    <span className="hidden sm:inline">{t("frissítés")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLocalMatchSetup(true)}
                    className="gap-2"
                  >
                    <IconPlayerPlay size={18} />
                    <span className="hidden sm:inline">{t("helyi_meccs")}</span>
                    <span className="sm:hidden">{t("helyi")}</span>
              </Button>
                </div>
              </div>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((match) => {
                  const statusConfig = {
                    ongoing: { label: t("jatekban_oj3d"), variant: 'default' as const, ring: 'ring-2 ring-primary' },
                    pending: { label: t("varakozik_nvfk"), variant: 'secondary' as const, ring: 'ring-2 ring-amber-500/50' },
                    finished: { label: t("befejezett_x25b"), variant: 'outline' as const, ring: '' },
                  };
                  const config = statusConfig[match.status as keyof typeof statusConfig] || statusConfig.finished;
                  
                  return (
                    <button
                      key={match._id}
                      onClick={() => handleMatchSelect(match)}
                      className={cn(
                        "text-left p-6 rounded-xl transition-all",
                        "bg-card/50 backdrop-blur-xl shadow-xl shadow-black/20 hover:shadow-2xl",
                        config.ring
                      )}
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-bold mb-1">
                            {match.player1.playerId.name} vs {match.player2.playerId.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t("író")}{match.scorer?.name ? match.scorer.name : t("elozo_kor_vesztese")}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{t("kezdő_pontszám_46")}{match.type === '501' ? '501' : match.type}</p>
                          <p>{match.legsToWin || 3} {t("nyert_leg")}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant={config.variant}>{config.label}</Badge>
                          <Button size="sm" variant="outline">
                            {t("kiválaszt")}</Button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {isAdminOrModerator && (
                <div className="text-center pt-4">
                  <Button
                    size="lg"
                    onClick={() => {
                      const dummyMatch: Match = {
                        _id: 'new-match',
                        boardReference: selectedBoard.boardNumber,
                        type: '501',
                        round: 1,
                        player1: { playerId: { _id: '', name: t("player_1_w5cv") } },
                        player2: { playerId: { _id: '', name: t("player_2_w5cv") } },
                        scorer: { playerId: '', name: t("scorer_u5wh") },
                        status: 'pending',
                        startingScore: 501,
                        legsToWin: 4
                      };
                      setSelectedMatch(dummyMatch);
                      setShowMatchSetup(true);
                    }}
                    className="gap-2"
                  >
                    <IconPlayerPlay size={20} />
                    {t("új_meccs_indítása")}</Button>
                </div>
              )}
            </div>
          )}
          
          {/* Local Match Setup Dialog */}
          <Dialog open={showLocalMatchSetup} onOpenChange={setShowLocalMatchSetup}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("helyi_meccs_beállítása")}</DialogTitle>
                <DialogDescription>
                  {t("állítsd_be_a")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="local-legsToWin" className="text-sm font-medium mb-2 block">
                    {t("nyert_legek_száma")}</Label>
                  <select 
                    id="local-legsToWin"
                    onChange={(e) => setLocalMatchLegsToWin(parseInt(e.target.value))} 
                    value={localMatchLegsToWin} 
                    className="select select-bordered w-full h-12"
                  >
                    {Array.from({ length: 20 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">{t("best_of")}{localMatchLegsToWin * 2 - 1}</p>
                </div>
                <div>
                  <Label htmlFor="local-startingScore" className="text-sm font-medium mb-2 block">
                    {t("kezdő_pontszám")}</Label>
                  <select 
                    id="local-startingScore"
                    onChange={(e) => setLocalMatchStartingScore(parseInt(e.target.value))} 
                    value={localMatchStartingScore} 
                    className="select select-bordered w-full h-12"
                  >
                    {startingScoreOptions.map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">{t("ebből_a_pontszámból")}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t("játékosok_26")}<span className="font-semibold">1</span> és <span className="font-semibold">2</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("a_játékos_mindig")}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowLocalMatchSetup(false)}>
                    {t("mégse")}</Button>
                  <Button className="flex-1" onClick={handleStartLocalMatch}>
                    {t("meccs_indítása")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Admin Modal */}
          {showAdminModal && adminMatch && (
            <Dialog open={showAdminModal} onOpenChange={(open) => {
              if (!open) {
                setShowAdminModal(false);
                setAdminMatch(null);
                setError("");
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t("admin_meccs_beállítás")}</DialogTitle>
                  <DialogDescription>
                    <div className="text-center mt-4">
                      <h4 className="text-lg font-bold mb-2">
                        {adminMatch.player1.playerId.name} vs {adminMatch.player2.playerId.name}
                      </h4>
                      <p className="text-muted-foreground">{t("állítsd_be_a_83")}</p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {adminMatch.player1.playerId.name} {t("nyert_legek")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      className="h-14"
                      value={player1Legs === '' ? '' : player1Legs}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPlayer1Legs(value === '' ? '' : parseInt(value) || 0);
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          setPlayer1Legs(0);
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {adminMatch.player2.playerId.name} {t("nyert_legek")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      className="h-14"
                      value={player2Legs === '' ? '' : player2Legs}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPlayer2Legs(value === '' ? '' : parseInt(value) || 0);
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          setPlayer2Legs(0);
                        }
                      }}
                    />
                  </div>
                </div>
                
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setShowAdminModal(false);
                      setAdminMatch(null);
                      setError("");
                    }}
                  >
                    {t("mégse")}</Button>
                  <Button
                    className="flex-1"
                    onClick={handleAdminMatchFinish}
                    disabled={adminLoading || player1Legs === player2Legs}
                  >
                    {adminLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-primary-foreground border-r-primary-foreground border-b-transparent border-l-transparent rounded-full animate-spin mr-2" />
                        {t("mentés")}</>
                    ) : (
                      t("meccs_befejezese")
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  }

  if (showMatchSetup && selectedMatch) {
    return (
      <BoardMatchSetupScreen
        match={selectedMatch}
        board={selectedBoard}
        legsToWin={legsToWin}
        startingPlayer={startingPlayer}
        onLegsToWinChange={setLegsToWin}
        onStartingPlayerChange={setStartingPlayer}
        onStart={handleStartMatch}
        onBack={handleBackToMatches}
        loading={setupLoading}
        showConfirmDialog={showConfirmDialog}
        onConfirmDialogChange={setShowConfirmDialog}
        getBoardLabel={getBoardLabel}
        backLabel={t("vissza")}
        scorerLabel={t("író")}
        previousRoundLoserLabel={t("elozo_kor_vesztese")}
        legsLabel={t("leg")}
        legsToWinLabel={t("hány_nyert_legig")}
        selectNumberLabel={t("válassz_számot")}
        whoStartsLabel={t("ki_kezdi")}
        bullLabel={t("a_bull_t")}
        cancelLabel={t("mégse")}
        startMatchLabel={t("meccs_indítása")}
        confirmTitle={t("meccs_indítása")}
        confirmDescription={t("ellenőrizd_a_beállításokat")}
        startingPlayerLabel={t("kezdő_játékos")}
        legsWonLabel={t("nyert_legek_0")}
        boardLabel={t("tábla")}
        playersLabel={t("játékosok_86")}
        saveLabel={t("indítás")}
      />
    );
  }

  // Game interface
  if (selectedMatch) {
    return (
      <MatchGame 
        match={{
          ...selectedMatch,
          legsToWin: selectedMatch.legsToWin || legsToWin
        }} 
        onBack={handleBackToMatches}
        onMatchFinished={loadMatches}
        clubId={tournamentData?.clubId?._id || tournamentData?.clubId}
        scoliaConfig={selectedBoard ? {
             serialNumber: selectedBoard.scoliaSerialNumber,
             accessToken: selectedBoard.scoliaAccessToken
        } : undefined}
      />
    );
  }

  return null;
};

export default BoardPage;
