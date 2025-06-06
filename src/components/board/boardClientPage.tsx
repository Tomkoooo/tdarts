'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";
import DartsCounter from "@/components/board/dartsCounter";
import { useSearchParams, useRouter } from "next/navigation";
import './board.css';

const validateSchema = z.object({
  code: z.string().min(1, "A torna kód megadása kötelező"),
  password: z.string().min(1, "A jelszó megadása kötelező"),
});

const boardSchema = z.object({
  boardNumber: z.string().min(1, "Válassz egy táblát"),
});

type ValidateForm = z.infer<typeof validateSchema>;
type BoardForm = z.infer<typeof boardSchema>;

export default function BoardPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [boardCount, setBoardCount] = useState<number>(0);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [player1Ready, setPlayer1Ready] = useState(false);
  const [player2Ready, setPlayer2Ready] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const [timerExpired, setTimerExpired] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [defaultValues, setDefaultValues] = useState({
    code: "",
    password: "",
  });

  const validateForm = useForm<ValidateForm>({
    resolver: zodResolver(validateSchema),
    defaultValues: { code: defaultValues.code, password: defaultValues.password },
  });

  const boardForm = useForm<BoardForm>({
    resolver: zodResolver(boardSchema),
    defaultValues: { boardNumber: "" },
  });

  useEffect(() => {
    const code = searchParams.get("code");
    const token = searchParams.get("token");
    const boardNumber = searchParams.get("boardNumber");

    if (code && token && boardNumber && !tournamentId) {
      handleQrLogin({ code, token, boardNumber });
    }
  }, [searchParams, tournamentId]);

  const handleQrLogin = async ({ code, token, boardNumber }: { code: string; token: string; boardNumber: string }) => {
    setLoading(true);
    try {
      const tokenRes = await fetch("/api/qr/validate-qr-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!tokenRes.ok) {
        const error = await tokenRes.json();
        throw new Error(error.error || "Érvénytelen QR-kód token");
      }

      const { password } = await tokenRes.json();
      console.log("QR-kód token ellenőrizve:", { code, password });

      await handleValidate({ code, password });

      boardForm.setValue("boardNumber", boardNumber);
      await handleBoardSelect({ boardNumber });

      router.replace("/board");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a QR-kód alapú bejelentkezés");
      setLoading(false);
    }
  };

  const handleExit = () => {
    localStorage.removeItem("tournamentId");
    localStorage.removeItem("tournamentCode");
    localStorage.removeItem("tournamentPassword");
    localStorage.removeItem("boardNumber");
    localStorage.removeItem("matchId");
    localStorage.removeItem("isReady");

    setTournamentId(null);
    setBoardCount(0);
    setSelectedBoard(null);
    setBoardId(null);
    setNextMatch(null);
    setIsReady(false);
    setPlayer1Ready(false);
    setPlayer2Ready(false);
    setSecondsRemaining(300);
    setTimerExpired(false);

    validateForm.reset();
    boardForm.reset();

    toast.success("Kilépve a tábláról");
  };

  useEffect(() => {
    if (!nextMatch || nextMatch.noMatch) {
      const interval = setInterval(async () => {
        await checkOngoingMatch(selectedBoard!);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [nextMatch]);

  useEffect(() => {
    if (nextMatch && !nextMatch.noMatch && !isReady) {
      setSecondsRemaining(300);
      setTimerExpired(false);
      setPlayer1Ready(false);
      setPlayer2Ready(false);

      const updateBoardStatus = async () => {
        if (!boardId) return;
        try {
          const res = await fetch(`/api/board/${boardId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "waiting" }),
          });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Nem sikerült a tábla állapotának frissítése");
          }
        } catch (error) {
          console.error("Hiba a tábla állapotának frissítésekor:", error);
        }
      };

      updateBoardStatus();

      const timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimerExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [nextMatch, isReady]);

  useEffect(() => {
    if (timerExpired && !isReady && nextMatch && !nextMatch.noMatch) {
      if (player1Ready && !player2Ready) {
        handleFinishMatch({
          winnerId: nextMatch.player1Id,
          player1Stats: { legsWon: 2, dartsThrown: 0, average: 0 },
          player2Stats: { legsWon: 0, dartsThrown: 0, average: 0 },
          highestCheckout: { player1: 0, player2: 0 },
          oneEighties: {
            player1: { count: 0, darts: [] },
            player2: { count: 0, darts: [] },
          },
        });
      } else if (player2Ready && !player1Ready) {
        handleFinishMatch({
          winnerId: nextMatch.player2Id,
          player1Stats: { legsWon: 0, dartsThrown: 0, average: 0 },
          player2Stats: { legsWon: 2, dartsThrown: 0, average: 0 },
          highestCheckout: { player1: 0, player2: 0 },
          oneEighties: {
            player1: { count: 0, darts: [] },
            player2: { count: 0, darts: [] },
          },
        });
      }
    }
  }, [timerExpired, player1Ready, player2Ready, isReady, nextMatch]);

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleValidate = async (data: ValidateForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/boards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a validáció");
      }
      const { tournamentId, boardCount } = await res.json();
      setTournamentId(tournamentId);
      setBoardCount(boardCount);
      localStorage.setItem("tournamentId", tournamentId);
      localStorage.setItem("tournamentCode", data.code);
      localStorage.setItem("tournamentPassword", data.password);
      toast.success("Torna sikeresen validálva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a validáció");
    } finally {
      setLoading(false);
    }
  };

  const handleBoardSelect = async (data: BoardForm) => {
    if (!tournamentId || !data.boardNumber) return;
    setLoading(true);
    try {
      const boardRes = await fetch(`/api/boards?tournamentId=${tournamentId}&boardNumber=${data.boardNumber}`);
      if (!boardRes.ok) {
        const error = await boardRes.json();
        throw new Error(error.error || "Nem sikerült a tábla lekérése");
      }
      const boardData = await boardRes.json();
      setBoardId(boardData.boardId);
      setSelectedBoard(data.boardNumber);
      localStorage.setItem("boardNumber", data.boardNumber);
      localStorage.setItem("boardId", boardData.boardId);

      const statusRes = await fetch(`/api/board/${boardData.boardId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "waiting" }),
      });
      if (!statusRes.ok) {
        const error = await statusRes.json();
        throw new Error(error.error || "Nem sikerült a tábla állapotának frissítése");
      }

      await checkOngoingMatch(data.boardNumber);

      toast.success("Tábla kiválasztva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a tábla kiválasztása");
    } finally {
      setLoading(false);
    }
  };

  const checkOngoingMatch = async (boardNumber: string) => {
    if (!tournamentId || !boardNumber) return;
    try {
      const matchRes = await fetch(`/api/boards/${tournamentId}/${boardNumber}/current-match`);
      setLoading(true);
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        setNextMatch(matchData);
        setIsReady(true);
        localStorage.setItem("matchId", matchData.matchId);
        localStorage.setItem("isReady", "true");
        setLoading(false);
        return;
      }
      const error = await matchRes.json();
      if (error.error === "Nincs folyamatban lévő mérkőzés") {
        const nextMatchRes = await fetch(`/api/boards/${tournamentId}/${boardNumber}/next-match`);
        if (!nextMatchRes.ok) {
          const nextError = await nextMatchRes.json();
          setLoading(false);
          throw new Error(nextError.error || "Nem sikerült a mérkőzés lekérése");
        }
        const matchData = await nextMatchRes.json();
        setNextMatch(matchData);
        setIsReady(false);
        localStorage.setItem("matchId", matchData.matchId || "");
        localStorage.setItem("isReady", "false");
        setLoading(false);
        return;
      }
      setLoading(false);
      throw new Error(error.error || "Nem sikerült a mérkőzés lekérése");
    } catch (error: any) {
      setLoading(false);
      console.error("Hiba a folyamatban lévő mérkőzés ellenőrzésekor:", error);
      setNextMatch({ noMatch: true });
      localStorage.removeItem("matchId");
      localStorage.setItem("isReady", "false");
    }
  };

  const handleReady = async () => {
    if (!nextMatch?.matchId || !boardId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${nextMatch.matchId}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, tournamentId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a mérkőzés indítása");
      }
      setIsReady(true);
      localStorage.setItem("isReady", "true");
      localStorage.setItem("matchId", nextMatch.matchId);
      toast.success("Mérkőzés elindítva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a mérkőzés indítása");
    } finally {
      setLoading(false);
    }
  };

  const readyPlayer = async (playerId: string) => {
    if (!nextMatch?.matchId || !boardId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${nextMatch.matchId}/ready`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a játékos állapotának frissítése");
      }
      setPlayer1Ready(true);
      toast.success("Játékos állapota frissítve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a játékos állapotának frissítése");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishMatch = async (finalStats: {
    winnerId: string;
    player1Stats: { legsWon: number; dartsThrown: number; average: number };
    player2Stats: { legsWon: number; dartsThrown: number; average: number };
    highestCheckout: { player1: number; player2: number };
    oneEighties: { player1: { count: number; darts: number[] }; player2: { count: number; darts: number[] } };
  }) => {
    if (!nextMatch?.matchId || !boardId || !selectedBoard) return;
    setLoading(true);
    try {
      const matchResult = {
        winnerId: finalStats.winnerId,
        player1LegsWon: finalStats.player1Stats.legsWon,
        player2LegsWon: finalStats.player2Stats.legsWon,
        stats: {
          player1: {
            legsWon: finalStats.player1Stats.legsWon,
            dartsThrown: finalStats.player1Stats.dartsThrown,
            average: finalStats.player1Stats.average,
            highestCheckout: finalStats.highestCheckout.player1,
            oneEighties: {
              count: finalStats.oneEighties.player1.count,
              darts: finalStats.oneEighties.player1.darts,
            },
          },
          player2: {
            legsWon: finalStats.player2Stats.legsWon,
            dartsThrown: finalStats.player2Stats.dartsThrown,
            average: finalStats.player2Stats.average,
            highestCheckout: finalStats.highestCheckout.player2,
            oneEighties: {
              count: finalStats.oneEighties.player2.count,
              darts: finalStats.oneEighties.player2.darts,
            },
          },
        },
        highestCheckout: finalStats.highestCheckout,
        oneEighties: finalStats.oneEighties,
      };

      const res = await fetch(`/api/matches/${nextMatch.matchId}/${tournamentId}/finish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchResult),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a mérkőzés befejezése");
      }
      const { nextMatch: newMatch } = await res.json();
      setNextMatch(newMatch || { noMatch: true });
      setIsReady(false);
      localStorage.setItem("isReady", "false");
      localStorage.setItem("matchId", newMatch?.matchId || "");

      await checkOngoingMatch(selectedBoard);

      toast.success("Mérkőzés befejezve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a mérkőzés befejezése");
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    } else {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error("Error entering fullscreen:", err);
        });
      }
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  useEffect(() => {
    const tournamentCode = window.localStorage.getItem("tournamentCode");
    const tournamentPassword = window.localStorage.getItem("tournamentPassword");

    if (tournamentCode && tournamentPassword) {
      setDefaultValues({
        code: tournamentCode,
        password: tournamentPassword,
      });
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const storedTournamentId = localStorage.getItem("tournamentId");
    const storedBoardNumber = localStorage.getItem("boardNumber");
    const storedCode = localStorage.getItem("tournamentCode");
    const storedPassword = localStorage.getItem("tournamentPassword");
    const storedMatchId = localStorage.getItem("matchId");
    const storedIsReady = localStorage.getItem("isReady") === "true";
    const storedBoardId = localStorage.getItem("boardId");

    if (storedBoardId) {
      setBoardId(storedBoardId);
    }

    const restoreMatch = async (matchId: string) => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (res.ok) {
          const matchData = await res.json();
          setNextMatch({
            matchId: matchData._id,
            player1Id: matchData.player1._id,
            player2Id: matchData.player2._id,
            player1Name: matchData.player1.name,
            player2Name: matchData.player2.name,
            scribeName: matchData.scorer?.name || "Nincs",
            stats: matchData.stats || {
              player1: { average: 0, dartsThrown: 0, legsWon: 0 },
              player2: { average: 0, dartsThrown: 0, legsWon: 0 },
            },
          });
          setIsReady(storedIsReady);
        } else {
          localStorage.removeItem("matchId");
          localStorage.setItem("isReady", "false");
          if (storedBoardNumber) {
            await checkOngoingMatch(storedBoardNumber);
          }
        }
      } catch (error) {
        console.error("Error restoring match:", error);
        localStorage.removeItem("matchId");
        localStorage.setItem("isReady", "false");
        if (storedBoardNumber) {
          await checkOngoingMatch(storedBoardNumber);
        }
      }
    };

    if (storedCode && storedPassword && !tournamentId) {
      handleValidate({ code: storedCode, password: storedPassword });
    }

    if (storedTournamentId && storedBoardNumber && tournamentId) {
      setSelectedBoard(storedBoardNumber);
      if (storedMatchId && storedIsReady) {
        restoreMatch(storedMatchId);
      } else {
        handleBoardSelect({ boardNumber: storedBoardNumber });
      }
    }
  }, [tournamentId]);

  return (
    <main className="min-h-screen w-full bg-base-200 flex items-center justify-center relative">
      <div className="fixed top-4 right-4 z-40 flex gap-3">
        {(!isReady || nextMatch?.noMatch) && (
          <>
            <button
              className="btn btn-error btn-lg z-50"
              onClick={handleExit}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "Kilépés a tábláról"}
            </button>
            <button
              onClick={() => checkOngoingMatch(selectedBoard!)}
              className="btn btn-warning btn-lg z-50"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "Frissítés"}
            </button>
          </>
        )}
        <button
          onClick={toggleFullscreen}
          className="md:btn btn-info btn-lg z-50 sm:hidden"
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : isFullscreen ? (
            "Kilépés a teljes képernyőből"
          ) : (
            "Teljes képernyő"
          )}
        </button>
      </div>

      {!tournamentId ? (
        <div className="card bg-base-100 shadow-xl p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Torna validáció</h1>
          <form onSubmit={validateForm.handleSubmit(handleValidate)}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Torna kód</span>
              </label>
              <input
                type="text"
                {...validateForm.register("code")}
                className="input input-bordered w-full"
                placeholder="Pl. ABC12345"
                defaultValue={defaultValues.code}
              />
              {validateForm.formState.errors.code && (
                <span className="text-error text-sm">
                  {validateForm.formState.errors.code.message}
                </span>
              )}
            </div>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Jelszó</span>
              </label>
              <input
                type="password"
                {...validateForm.register("password")}
                className="input input-bordered w-full"
                placeholder="Torna jelszó"
                defaultValue={defaultValues.password}
              />
              {validateForm.formState.errors.password && (
                <span className="text-error text-sm">
                  {validateForm.formState.errors.password.message}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : "Validálás"}
            </button>
          </form>
        </div>
      ) : !selectedBoard ? (
        <div className="card bg-base-100 shadow-xl sm:px-6 sm:py-0 md:p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Tábla kiválasztása</h1>
          <form onSubmit={boardForm.handleSubmit(handleBoardSelect)}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Tábla száma</span>
              </label>
              <select
                {...boardForm.register("boardNumber")}
                className="select select-bordered w-full"
              >
                <option value="">Válassz táblát</option>
                {Array.from({ length: boardCount }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Tábla {num}
                  </option>
                ))}
              </select>
              {boardForm.formState.errors.boardNumber && (
                <span className="text-error text-sm">
                  {boardForm.formState.errors.boardNumber.message}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : "Kiválasztás"}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-base-200">
          {nextMatch?.noMatch ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Nincs több mérkőzés</h2>
              <p>Ezen a táblán (Tábla {selectedBoard}) minden mérkőzés lejátszódott.</p>
            </div>
          ) : !isReady ? (
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold">Tábla {selectedBoard}</h2>
              <p className="text-2xl">
                {nextMatch?.player1Name} vs. {nextMatch?.player2Name}
              </p>
              <p className="text-xl">Eredményíró: {nextMatch?.scribeName}</p>
              {timerExpired && !player1Ready && !player2Ready ? (
                <button
                  className="btn btn-success btn-outline btn-lg"
                  onClick={() => {
                    handleReady();
                  }}
                  disabled={loading}
                >
                  {loading ? <span className="loading loading-spinner"></span> : "Ready"}
                </button>
              ) : (
                <div className="flex gap-4 items-center">
                  <button
                    className="btn btn-success btn-outline btn-lg"
                    onClick={() => {
                      setPlayer1Ready(true);
                      readyPlayer(nextMatch.player1Id);
                      if (player2Ready) {
                        handleReady();
                      }
                    }}
                    disabled={loading || player1Ready}
                  >
                    {loading && !player1Ready ? (
                      <span className="loading loading-spinner"></span>
                    ) : player1Ready ? (
                      `${nextMatch?.player1Name}`
                    ) : (
                      `${nextMatch?.player1Name}`
                    )}
                  </button>
                  <div className={`text-6xl font-bold ${secondsRemaining <= 30 ? "text-error" : "text-warning"}`}>
                    {formatTimer(secondsRemaining)}
                  </div>
                  <button
                    className="btn btn-success btn-outline btn-lg"
                    onClick={() => {
                      setPlayer2Ready(true);
                      readyPlayer(nextMatch.player2Id);
                      if (player1Ready) {
                        handleReady();
                      }
                    }}
                    disabled={loading || player2Ready}
                  >
                    {loading && !player2Ready ? (
                      <span className="loading loading-spinner"></span>
                    ) : player2Ready ? (
                      `${nextMatch?.player2Name}`
                    ) : (
                      ` ${nextMatch?.player2Name}`
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <DartsCounter
              match={{
                matchId: nextMatch.matchId,
                player1Id: nextMatch.player1Id,
                player2Id: nextMatch.player2Id,
                player1Name: nextMatch.player1Name,
                player2Name: nextMatch.player2Name,
                scribeName: nextMatch.scribeName,
                stats: nextMatch.stats || {
                  player1: { average: 0, dartsThrown: 0, legsWon: 0 },
                  player2: { average: 0, dartsThrown: 0, legsWon: 0 },
                },
              }}
              boardId={boardId!}
              selectedBoard={selectedBoard!}
              handleFinishMatch={handleFinishMatch}
            />
          )}
        </div>
      )}
    </main>
  );
}