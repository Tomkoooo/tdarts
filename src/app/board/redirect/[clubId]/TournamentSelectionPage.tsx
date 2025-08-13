'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Tournament {
  _id: string;
  tournamentId: string;
  tournamentSettings: {
    name: string;
    status: string;
    format: string;
    maxPlayers: number;
  };
  tournamentPlayers: any[];
  createdAt: string;
}

interface TournamentSelectionPageProps {
  tournaments: Tournament[];
  clubId: string;
}

const TournamentSelectionPage: React.FC<TournamentSelectionPageProps> = ({ tournaments }) => {
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTournament) {
      setError('Kérjük válassz ki egy tornát.');
      return;
    }

    if (!password) {
      setError('Kérjük add meg a jelszót.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${selectedTournament}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/board/${selectedTournament}`);
      } else {
        setError(data.error || 'Hibás jelszó.');
      }
    } catch (err) {
      console.error(err);
      setError('Hiba történt a kapcsolódás során.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Várakozik';
      case 'group-stage': return 'Csoportkör';
      case 'knockout': return 'Egyenes kiesés';
      case 'finished': return 'Befejezve';
      default: return 'Ismeretlen';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'group-stage': return 'badge-info';
      case 'knockout': return 'badge-primary';
      case 'finished': return 'badge-success';
      default: return 'badge-base-300';
    }
  };

  const getFormatText = (format: string) => {
    switch (format) {
      case 'group': return 'Csoportkör';
      case 'knockout': return 'Egyenes kiesés';
      case 'group_knockout': return 'Csoportkör + Egyenes kiesés';
      default: return 'Ismeretlen';
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl mb-6">Torna Kiválasztása</h1>
            
            <p className="text-base-content/70 mb-6">
              Több aktív torna található ebben a klubban. Kérjük válaszd ki, melyik tornához szeretnél csatlakozni.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tournament Selection */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Válassz tornát:</span>
                </label>
                <div className="space-y-3">
                  {tournaments.map((tournament) => (
                    <div
                      key={tournament._id}
                      className={`card bg-base-200 cursor-pointer transition-all hover:shadow-md ${
                        selectedTournament === tournament.tournamentId ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTournament(tournament.tournamentId)}
                    >
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{tournament.tournamentSettings.name}</h3>
                            <div className="flex gap-2 mt-2">
                              <span className={`badge ${getStatusColor(tournament.tournamentSettings.status)}`}>
                                {getStatusText(tournament.tournamentSettings.status)}
                              </span>
                              <span className="badge badge-outline">
                                {getFormatText(tournament.tournamentSettings.format)}
                              </span>
                            </div>
                            <div className="text-sm text-base-content/60 mt-2">
                              <p>Játékosok: {tournament.tournamentPlayers.length}/{tournament.tournamentSettings.maxPlayers}</p>
                              <p>Létrehozva: {new Date(tournament.createdAt).toLocaleDateString('hu-HU')}</p>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="tournament"
                            value={tournament.tournamentId}
                            checked={selectedTournament === tournament.tournamentId}
                            onChange={() => setSelectedTournament(tournament.tournamentId)}
                            className="radio radio-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Password Input */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Torna jelszó:</span>
                </label>
                <input
                  type="password"
                  placeholder="Add meg a torna jelszavát"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-error">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="form-control">
                <button
                  type="submit"
                  className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                  disabled={loading || !selectedTournament || !password}
                >
                  {loading ? 'Kapcsolódás...' : 'Csatlakozás a tornához'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentSelectionPage;
