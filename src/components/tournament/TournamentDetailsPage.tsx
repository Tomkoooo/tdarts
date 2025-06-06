'use client';

import { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "next/navigation";
import TournamentHeader from "@/components/tournament/TournamentHeader";
import PlayerManagement from "@/components/tournament/PlayerManagement";
import GroupSection from "@/components/tournament/GroupSection";
import BoardSection from "@/components/tournament/BoardSection";
import BracketSection from "@/components/tournament/BracketSection";
import MatchResultEditor from "./MatchResultEditor";

export interface Player {
  _id: string;
  name: string;
  stats?: {
    matchesWon: number;
    oneEightiesCount: number;
    highestCheckout: number;
  };
}

export interface Standing {
  playerId: { _id: string; name: string };
  points: number;
  legsWon: number;
  legsLost: number;
  rank: number;
}

export interface GroupPlayer {
  playerId: { _id: string; name: string };
  number: number;
}

export interface Group {
  _id: string
  players: {
    playerId: { _id: string; name: string };
    number: number;
  }[];
  boardNumber: string;
  matches: {
    _id: string;
    boardId: string;
    status: "pending" | "ongoing" | "finished";
    player1: { _id: string; name: string };
    player2: { _id: string; name: string };
    scorer?: { _id: string; name: string };
    stats: {
      player1: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
      player2: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
    }
  }[]
  standings: {
    playerId: { _id: string; name: string };
    points: number;
    legsWon: number;
    legsLost: number;
    legDifference: number;
    rank: number;
  }[];
}

export interface Match {
  _id: string;
  player1: { _id: string; name: string } | null;
  player2: { _id: string; name: string } | null;
  matchReference: {
    _id: string;
    status: "pending" | "ongoing" | "finished";
    player1Status: "unready" | "ready";
    player2Status: "unready" | "ready";
    player1: { _id: string; name: string };
    player2: { _id: string; name: string };
    scorer?: { _id: string; name: string };
    winner?: { _id: string; name: string };
    stats: {
      player1: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
      player2: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
    };
    round: number
    isKnockout: boolean;
  } | null;
}

export interface Board {
  _id: string;
  boardNumber: number;
  boardId: string;
  status: "idle" | "waiting" | "playing";
  waitingPlayers: { _id: string; name: string }[];
  updatedAt: Date 
  nextMatch?: {
    player1Name: string;
    player1Status: "unready" | "ready";
    player2Status: "unready" | "ready";
    player2Name: string;
    scribeName: string;
  } | null;
  currentMatch?: {
    matchId: string;  
    player1Name: string;
    player1Status: "unready" | "ready";
    player2Status: "unready" | "ready";
    player2Name: string;
    scribeName: string;
    stats: {
      player1Legs: number;
      player2Legs: number;
    };
  } | null;
}

export interface Tournament {
  _id: string;
  code: string;
  name: string;
  status: "created" | "group" | "knockout" | "finished";
  boardCount: number;
  description?: string;
  createdAt: string;
  startTime: Date;
  players: Player[];
  groups: Group[];
  knockout: {
    rounds: {
      matches: Match[];
    }[];
  };
  standing?: {
    playerId: string;
    rank: number;
  }[];
}

export default function TournamentDetailsPage() {
  const { code } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "ranking" | "standings">("name");
  const [loading, setLoading] = useState(false);
  const [matchFilter, setMatchFilter] = useState<"all" | "pending" | "ongoing" | "finished">("all");
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(10);
  const [autoFetch, setAutoFetch] = useState<boolean>(false);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}`);
      if (!res.ok) throw new Error("Nem sikerült a torna lekérése");
      const data = await res.json();

      const updatedBoards = data.boards.map((board: Board) => {
        if (!board.currentMatch || !board.currentMatch.matchId) {
          return board; // No current match, return unchanged
        }

        // Find the group corresponding to the board's boardNumber
        const boardIndex = board.boardNumber - 1; // Assuming boardNumber starts at 1
        const group = data.tournament.groups[boardIndex];

        if (!group || !group.matches) {
          console.warn(`No group or matches found for boardNumber ${board.boardNumber}`);
          return board;
        }

        // Find the match with matching _id
        const match = group.matches.find(
          (m: { _id: string }) => m._id === board.currentMatch?.matchId
        );

        if (!match) {
          console.warn(`Match ${board.currentMatch.matchId} not found in group ${boardIndex}`);
          return board;
        }

        // Add player1Status and player2Status to currentMatch
        return {
          ...board,
          currentMatch: {
            ...board.currentMatch,
            player1Status: match.player1Status,
            player2Status: match.player2Status,
          },
        };
      });

      // Update state
      setTournament(data.tournament);
      setBoards(updatedBoards);

      console.log('Updated boards:', updatedBoards);
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a torna lekérése");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();

    let pollingIntervalId: NodeJS.Timeout | null = null;
    let countdownIntervalId: NodeJS.Timeout | null = null;

    if (autoFetch) {
      pollingIntervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/tournaments/${code}`);
          if (!res.ok) return;
          const data = await res.json();
          setTournament(data.tournament);
          setBoards(data.boards);
          setSecondsUntilRefresh(10);
        } catch (error) {
          console.error("Hiba a táblák pollingja során:", error);
        }
      }, 10000);

      countdownIntervalId = setInterval(() => {
        setSecondsUntilRefresh((prev) => (prev > 0 ? prev - 1 : 10));
      }, 1000);
    }

    return () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      if (countdownIntervalId) clearInterval(countdownIntervalId);
    };
  }, [code, autoFetch]);

  const handleModeratorAuth = async (password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Helytelen jelszó");
      }
      setIsModerator(true);
      toast.success("Sikeresen hitelesítve mint moderátor");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a hitelesítés");
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (name: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a játékos hozzáadása");
      }
      await fetchTournament();
      toast.success("Játékos sikeresen hozzáadva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a játékos hozzáadása");
    } finally {
      setLoading(false);
    }
  };

  const removePlayer = async (playerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/players`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a játékos törlése");
      }
      await fetchTournament();
      toast.success("Játékos sikeresen törölve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a játékos törlése");
    } finally {
      setLoading(false);
    }
  };

  const regenerateGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/assign-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a csoportok újragenerálása");
      }
      await fetchTournament();
      toast.success("Csoportok és mérkőzések sikeresen újragenerálva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a csoportok újragenerálása");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a torna befejezése");
      }
      await fetchTournament();
      toast.success("Torna sikeresen befejezve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a torna befejezése");
    } finally {
      setLoading(false);
    }
  };

  const getEliminatedPlayers = useMemo(() => {
    return (groupIndex: number): string[] => {
      if (!tournament || !tournament.groups || !tournament.players) return [];
      const totalPlayers = tournament.players.length;
      const groupsCount = tournament.groups.length;
      if (groupsCount === 0) return [];
  
      // Hardcoded rule for 70+ players and 16 tables
      if (totalPlayers > 70 && groupsCount === 16) {
        const group = tournament.groups[groupIndex];
        if (!group.standings) return [];
  
        // Sort standings by rank
        const sortedStandings = [...group.standings].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  
        // Top 3 players advance, the rest are eliminated
        const eliminatedPlayers = sortedStandings.slice(3).map((s) => s.playerId._id);
  
        return eliminatedPlayers;
      }
  
      // Default logic for other cases
      const qualifyingPlayers = Math.pow(2, Math.floor(Math.log2(totalPlayers)));
      const eliminatedPlayersCount = totalPlayers - qualifyingPlayers;
  
      const groupSizes = tournament.groups.map((group) => group.players?.length || 0);
      const totalGroupPlayers = groupSizes.reduce((sum, size) => sum + size, 0);
  
      const eliminationsPerGroup = groupSizes.map((size) =>
        Math.round((size / totalGroupPlayers) * eliminatedPlayersCount)
      );
  
      let currentTotal = eliminationsPerGroup.reduce((sum, count) => sum + count, 0);
      while (currentTotal !== eliminatedPlayersCount) {
        const diff = eliminatedPlayersCount - currentTotal;
        const indexToAdjust = diff > 0
          ? groupSizes.findIndex((size, i) => eliminationsPerGroup[i] < size)
          : groupSizes.findIndex((size, i) => eliminationsPerGroup[i] > 0);
        if (indexToAdjust === -1) break;
        eliminationsPerGroup[indexToAdjust] += diff > 0 ? 1 : -1;
        currentTotal += diff > 0 ? 1 : -1;
      }
  
      const group = tournament.groups[groupIndex];
      const eliminatedInGroup = eliminationsPerGroup[groupIndex] || 0;
  
      if (!group.standings || eliminatedInGroup <= 0) return [];
  
      const sortedStandings = [...group.standings].sort((a, b) => (a.rank || 0) - (b.rank || 0));
      const eliminatedPlayers = sortedStandings.slice(-eliminatedInGroup).map((s) => s.playerId._id);
  
      return eliminatedPlayers;
    };
  }, [tournament]);

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült az állapot módosítása");
      }
      if (status === "knockout") {
        const generateRes = await fetch(`/api/tournaments/${code}/generate-knockout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!generateRes.ok) {
          const error = await generateRes.json();
          throw new Error(error.error || "Nem sikerült a kieséses szakasz mérkőzéseinek generálása");
        }
      }
      await fetchTournament();
      toast.success("Torna állapota sikeresen módosítva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült az állapot módosítása");
    } finally {
      setLoading(false);
    }
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-base-200 w-full flex items-center justify-center">
        <div className="spinner loading loading-spinner bg-red-800"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-base-200 w-full">
      <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
        <PlayerManagement
          players={tournament.players}
          isModerator={isModerator}
          isSidebarOpen={isSidebarOpen}
          sortBy={sortBy}
          secondsUntilRefresh={secondsUntilRefresh}
          setIsSidebarOpen={setIsSidebarOpen}
          setSortBy={setSortBy}
          addPlayer={addPlayer}
          removePlayer={removePlayer}
          loading={loading}
          code={code as string}
          autoFetch={autoFetch}
          tournament={tournament} // Pass tournament to access standings
        />
        <div className=" w-2/3">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body pt-0">
              {isModerator && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={regenerateGroups}
                      disabled={loading || tournament.status === "finished" || tournament.status === "knockout"}
                    >
                      Csoportok újragenerálása
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={() => updateStatus("knockout")}
                      disabled={loading || tournament.status === "finished" || tournament.status === "knockout"}
                    >
                      Kieséses szakasz indítása
                    </button>
                    <button
                      className="btn btn-error"
                      onClick={handleFinish}
                      disabled={loading || !["group", "knockout"].includes(tournament.status)}
                    >
                      Torna befejezése
                    </button>
                  </div>
                  <MatchResultEditor
                    tournamentId={tournament._id}
                    isModerator={isModerator}
                    loading={loading}
                  />
                </>
              )}
              <TournamentHeader
                tournament={tournament}
                fetchTournament={fetchTournament}
                loading={loading}
                autoFetch={autoFetch}
                setAutoFetch={setAutoFetch}
                isModerator={isModerator}
                setIsModerator={setIsModerator}
                handleModeratorAuth={handleModeratorAuth}
              />
              <GroupSection
                groups={tournament.groups}
                getEliminatedPlayers={getEliminatedPlayers}
                matchFilter={matchFilter}
                setMatchFilter={setMatchFilter}
              />
              <BoardSection boards={boards} isModerator={isModerator} code={tournament.code} />
              <BracketSection tournament={tournament} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}