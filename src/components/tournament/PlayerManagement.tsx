import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Player, Tournament } from "./TournamentDetailsPage";
import toast from "react-hot-toast";
import usePlayerStatsModal from "@/hooks/usePlayerStatsModal";
import PlayerSearch from '../club/PlayerSearch';

const playerSchema = z.object({
  playerInput: z.string().min(1, "A játékos neve kötelező"),
});

type PlayerForm = z.infer<typeof playerSchema>;

interface PlayerManagementProps {
  players: Player[];
  isModerator: boolean;
  isSidebarOpen: boolean;
  sortBy: "name" | "ranking" | "standings";
  secondsUntilRefresh: number;
  setIsSidebarOpen: (open: boolean) => void;
  setSortBy: (sortBy: "name" | "ranking" | "standings") => void;
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  loading: boolean;
  code: string;
  autoFetch: boolean;
  tournament: Tournament;
}

function PlayerManagement({
  players,
  isModerator,
  isSidebarOpen,
  sortBy,
  secondsUntilRefresh,
  setIsSidebarOpen,
  setSortBy,
  addPlayer,
  removePlayer,
  loading,
  code,
  autoFetch,
  tournament,
}: PlayerManagementProps) {
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const { openPlayerStatsModal, PlayerStatsModal } = usePlayerStatsModal();

  const playerForm = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: { playerInput: "" },
  });

  const handlePlayerSearch = async (query: string) => {
    if (query.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/players/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlayerSuggestions(data.players.map((p: { name: string }) => p.name));
    } catch (error) {
      console.error("Hiba a játékosok keresésekor:", error);
    }
  };

  // Új: PlayerSearch callback
  const handlePlayerSelected = async (player: any) => {
    await addPlayer(player._id);
    // Frissítés, reset, stb. ha kell
  };

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
    } else if (sortBy === "ranking") {
      return (b.stats?.matchesWon || 0) - (a.stats?.matchesWon || 0);
    } else if (sortBy === "standings" && tournament.standing) {
      const rankA = tournament.standing.find((s) => s.playerId === a._id)?.rank || Infinity;
      const rankB = tournament.standing.find((s) => s.playerId === b._id)?.rank || Infinity;
      return rankA - rankB;
    }
    return 0;
  });

  const getPlayerRank = (playerId: string) => {
    if (!tournament.standing) return null;
    const standing = tournament.standing.find((s) => s.playerId === playerId);
    return standing ? `Top ${standing.rank}` : null;
  };

  return (
    <div className={`sidebar md:w-1/4 ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className="sidebar-content md:hidden">
        <button
          className="btn btn-primary"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          Sidebar {isSidebarOpen ? "bezárása" : "megnyitása"}
        </button>
      </div>
      <div className={`sidebar-panel bg-base-100 w-full p-4 h-full ${isSidebarOpen ? "block" : "hidden md:block"}`}>
        {isSidebarOpen && (
          <div
            className="sidebar-overlay fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold ">Játékosok</h2>
          <span 
            className="italic cursor-pointer" 
            onClick={() => {navigator.clipboard.writeText(code); toast.success("Vágólapra másolva!")}}
            title="Kattints a másoláshoz"
          >
            Torna kód: {code}
          </span>
        </div>
        <div className="flex gap-2 mb-4 items-center justify-between flex-wrap">
          <div className="flex gap-2">
            <button
              className={`btn btn-sm btn-outline ${sortBy === "name" ? "btn-active" : ""}`}
              onClick={() => setSortBy("name")}
            >
              Betűrend
            </button>
            {tournament.standing && tournament.standing.length > 0 && (
              <button
                className={`btn btn-sm btn-outline ${sortBy === "standings" ? "btn-active" : ""}`}
                onClick={() => setSortBy("standings")}
              >
                Helyezések
              </button>
            )}
          </div>
          {autoFetch ? (
            <span className="text-sm font-medium">
              Következő frissítés: {secondsUntilRefresh} mp
            </span>
          ) : (
            <span className="text-sm italic text-right">
              Automatikus frissítés kikapcsolva
            </span>
          )}
        </div>
        {/* Új: PlayerSearch csak admin/moderátor és group stage előtt */}
        {isModerator && tournament.status === 'created' && (
          <div className="mb-4">
            <PlayerSearch onPlayerSelected={handlePlayerSelected} clubId={tournament.clubId} />
          </div>
        )}
        {isModerator && (
          <form
            onSubmit={playerForm.handleSubmit(({ playerInput }) => {
              addPlayer(playerInput);
              playerForm.reset();
            })}
            className="form-control mb-4"
          >
            <label className="label">
              <span className="label-text">Játékos hozzáadása</span>
            </label>
            <div className="relative">
              <input
                type="text"
                {...playerForm.register("playerInput")}
                className="input input-bordered w-full"
                placeholder="Add meg a játékos nevét"
                onChange={(e) => {
                  playerForm.setValue("playerInput", e.target.value);
                  handlePlayerSearch(e.target.value);
                }}
              />
              {playerSuggestions.length > 0 && (
                <ul className="absolute z-10 bg-base-100 border border-base-300 rounded-md mt-1 w-full max-h-40 overflow-auto">
                  {playerSuggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      className="p-2 hover:bg-primary hover:text-primary-content cursor-pointer"
                      onClick={() => {
                        playerForm.setValue("playerInput", suggestion);
                        addPlayer(suggestion);
                        playerForm.reset();
                      }}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={loading}>
              Hozzáad
            </button>
            {playerForm.formState.errors.playerInput && (
              <span className="text-error text-sm">
                {playerForm.formState.errors.playerInput.message}
              </span>
            )}
          </form>
        )}
        <ul className="space-y-3 sticky top-4">
          {sortedPlayers.map((player, index) => (
            <li
              key={player._id}
              className={`flex justify-between items-center py-1 px-2 rounded-md ${
                index % 2 === 0 ? "bg-base-200" : ""
              } hover:bg-primary/10 transition-colors`}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => openPlayerStatsModal(player._id)}
                  className="text-base font-medium btn btn-ghost"
                >
                  {player.name}
                  {getPlayerRank(player._id) && (
                    <span className="ml-2 text-sm text-primary">
                      ({getPlayerRank(player._id)})
                    </span>
                  )}
                </button>
                <PlayerStatsModal />
                <div className="text-sm">
                  {player.stats && player.stats.oneEightiesCount > 0 && (
                    <span className="text-success mr-2">
                      {player.stats.oneEightiesCount}x180
                    </span>
                  )}
                  {player.stats && player.stats.highestCheckout > 80 && (
                    <span className="text-info">
                      HC: {player.stats.highestCheckout}
                    </span>
                  )}
                </div>
              </div>
              {/* Törlés gomb admin/moderátor számára, csak group stage előtt */}
              {isModerator && tournament.status === 'created' && (
                <button
                  className="btn btn-xs btn-error ml-2"
                  onClick={() => removePlayer(player._id)}
                  title="Játékos törlése a tornából"
                >
                  Törlés
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PlayerManagement;