'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Ikonok
const IconTrophy = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const IconMedal = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const IconStar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

interface LeagueStanding {
  _id: string;
  playerId: {
    _id: string;
    username: string;
    name?: string;
  };
  totalPoints: number;
  tournamentsPlayed: number;
  bestFinish: number;
  pointsBreakdown: {
    groupStage: number;
    knockoutStage: number;
    manual: number;
    existing: number;
  };
  finishes: {
    first: number;
    second: number;
    third: number;
    top5: number;
    top10: number;
  };
  lastUpdated: string;
}

interface LeagueStandingsProps {
  leagueId: string;
  leagueName: string;
}

export default function LeagueStandings({ leagueId, leagueName }: LeagueStandingsProps) {
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Liga állás betöltése
  const fetchStandings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/leagues/${leagueId}/standings`);
      if (response.data.success) {
        setStandings(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching league standings:', error);
      setError(error.response?.data?.error || 'Hiba történt az állás betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [leagueId]);

  // Helyezés ikon megjelenítése
  const getPositionIcon = (position: number) => {
    if (position === 1) {
      return <IconTrophy className="text-yellow-500" />;
    } else if (position === 2) {
      return <IconMedal className="text-gray-400" />;
    } else if (position === 3) {
      return <IconMedal className="text-amber-600" />;
    }
    return null;
  };

  // Helyezés szín osztály
  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-500 font-bold';
    if (position === 2) return 'text-gray-400 font-semibold';
    if (position === 3) return 'text-amber-600 font-semibold';
    if (position <= 5) return 'text-blue-500';
    if (position <= 10) return 'text-green-500';
    return 'text-base-content';
  };

  if (loading) {
    return (
      <div className="admin-glass-card">
        <div className="flex items-center justify-center h-32">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-glass-card">
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={fetchStandings} className="btn btn-sm btn-ghost">
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-glass-card">
      <div className="flex items-center gap-2 mb-6">
        <IconTrophy className="text-primary" />
        <h3 className="text-xl font-bold text-base-content">{leagueName} - Liga Állás</h3>
      </div>

      {standings.length === 0 ? (
        <div className="text-center py-8">
          <IconTrophy className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
          <p className="text-base-content/60">Még nincsenek eredmények a ligában</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="border-b border-base-300">
                <th className="text-left font-semibold text-base-content">Helyezés</th>
                <th className="text-left font-semibold text-base-content">Játékos</th>
                <th className="text-center font-semibold text-base-content">Pontok</th>
                <th className="text-center font-semibold text-base-content">Versenyek</th>
                <th className="text-center font-semibold text-base-content">Legjobb</th>
                <th className="text-center font-semibold text-base-content">Helyezések</th>
                <th className="text-center font-semibold text-base-content">Részletek</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr key={standing._id} className="hover:bg-base-200/50">
                  <td className="font-mono text-lg">
                    <div className="flex items-center gap-2">
                      <span className={getPositionColor(index + 1)}>
                        #{index + 1}
                      </span>
                      {getPositionIcon(index + 1)}
                    </div>
                  </td>
                  
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-base-content">
                        {standing.playerId.name || standing.playerId.username}
                      </span>
                      {standing.playerId.name && (
                        <span className="text-sm text-base-content/60">
                          @{standing.playerId.username}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="text-center">
                    <span className="text-xl font-bold text-primary">
                      {standing.totalPoints}
                    </span>
                  </td>
                  
                  <td className="text-center">
                    <span className="badge badge-neutral">
                      {standing.tournamentsPlayed}
                    </span>
                  </td>
                  
                  <td className="text-center">
                    <span className={`badge ${
                      standing.bestFinish === 1 ? 'badge-success' :
                      standing.bestFinish === 2 ? 'badge-warning' :
                      standing.bestFinish === 3 ? 'badge-info' :
                      'badge-neutral'
                    }`}>
                      {standing.bestFinish === 1 ? '1. hely' :
                       standing.bestFinish === 2 ? '2. hely' :
                       standing.bestFinish === 3 ? '3. hely' :
                       `${standing.bestFinish}. hely`}
                    </span>
                  </td>
                  
                  <td className="text-center">
                    <div className="flex flex-col gap-1 text-xs">
                      {standing.finishes.first > 0 && (
                        <span className="badge badge-success badge-xs">
                          🥇 {standing.finishes.first}
                        </span>
                      )}
                      {standing.finishes.second > 0 && (
                        <span className="badge badge-warning badge-xs">
                          🥈 {standing.finishes.second}
                        </span>
                      )}
                      {standing.finishes.third > 0 && (
                        <span className="badge badge-info badge-xs">
                          🥉 {standing.finishes.third}
                        </span>
                      )}
                      {standing.finishes.top5 > 0 && (
                        <span className="badge badge-neutral badge-xs">
                          Top 5: {standing.finishes.top5}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="text-center">
                    <div className="dropdown dropdown-left">
                      <button className="btn btn-ghost btn-xs">
                        <IconStar />
                      </button>
                      <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li className="menu-title text-xs text-base-content/60">Pontok bontása</li>
                        <li>
                          <span className="text-sm">
                            Csoportkör: {standing.pointsBreakdown.groupStage}
                          </span>
                        </li>
                        <li>
                          <span className="text-sm">
                            Kieséses: {standing.pointsBreakdown.knockoutStage}
                          </span>
                        </li>
                        <li>
                          <span className="text-sm">
                            Manuális: {standing.pointsBreakdown.manual}
                          </span>
                        </li>
                        <li>
                          <span className="text-sm">
                            Meglévő: {standing.pointsBreakdown.existing}
                          </span>
                        </li>
                        <li className="divider"></li>
                        <li>
                          <span className="text-xs text-base-content/60">
                            Utoljára frissítve: {new Date(standing.lastUpdated).toLocaleDateString('hu-HU')}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Összesítő statisztikák */}
      {standings.length > 0 && (
        <div className="mt-6 pt-4 border-t border-base-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{standings.length}</div>
              <div className="text-sm text-base-content/60">Résztvevő</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">
                {Math.max(...standings.map(s => s.totalPoints))}
              </div>
              <div className="text-sm text-base-content/60">Legtöbb pont</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-info">
                {Math.round(standings.reduce((sum, s) => sum + s.totalPoints, 0) / standings.length)}
              </div>
              <div className="text-sm text-base-content/60">Átlagos pont</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">
                {standings.reduce((sum, s) => sum + s.tournamentsPlayed, 0)}
              </div>
              <div className="text-sm text-base-content/60">Összes verseny</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
