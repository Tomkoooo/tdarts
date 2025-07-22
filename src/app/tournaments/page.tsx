'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TournamentSearch from "@/components/tournament/tournamentSearch";
import { Tournament } from "@/types/tournamentSchema";

export default function Page() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/tournaments");
        if (!res.ok) throw new Error("Nem sikerült a tornák lekérése");
        const data = await res.json();
        setTournaments(data.tournaments);
      } catch (err: any) {
        setError(err.message || "Hiba történt a tornák lekérésekor");
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const handleSearch = useCallback((filteredTournaments: Tournament[]) => {
    setTournaments(filteredTournaments);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 w-full flex items-center justify-center">
        <div className="spinner loading loading-spinner bg-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-error">{error}</h2>
          <button
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Újra próbálkozás
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-base-200">
      <div className="container mx-auto p-4">
        <TournamentSearch
          initialTournaments={tournaments}
          onSearch={handleSearch}
        />
        {tournaments.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-base-content">
              Nem található verseny
            </h2>
            <p className="text-base-content/70 mt-2">
              Készíts egy versenyt, hogy elkezdhess játszani!
            </p>
            <Link href="/createTournament">
              <button className="btn btn-primary mt-4">Verseny létrehozása</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.code}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div className="card-body">
                  <h2 className="card-title text-lg">{tournament.name}</h2>
                  <p className="text-sm text-base-content/70">
                    Kód: {tournament.code}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Státusz: {tournament.status}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Klub: {(tournament.clubId as any)?.name || "Ismeretlen"}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Létrehozva: {new Date(tournament.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Kezdés: {new Date(tournament.startDate).toLocaleString()}
                  </p>
                  <div className="card-actions justify-end">
                    <Link href={`/tournaments/${tournament.code}`}>
                      <button className="btn btn-primary btn-sm">Megtekintés</button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}