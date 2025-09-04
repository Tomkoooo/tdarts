'use client';
import React, { useState, useEffect } from 'react';
import { IconX, IconTrophy, IconUsers, IconEdit, IconUser } from '@tabler/icons-react';
import { League, LeagueStatsResponse, LeagueLeaderboard } from '@/interface/league.interface';
import PlayerSearch from './PlayerSearch';
import TournamentCard from '../tournament/TournamentCard';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';

interface LeagueDetailModalProps {
  league: League;
  clubId: string;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  isOpen: boolean;
  onClose: () => void;
  onLeagueUpdated: () => void;
}

type TabType = 'leaderboard' | 'tournaments' | 'settings';

export default function LeagueDetailModal({
  league,
  clubId,
  userRole,
  isOpen,
  onClose,
  onLeagueUpdated
}: LeagueDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [leagueStats, setLeagueStats] = useState<LeagueStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const canManage = userRole === 'admin' || userRole === 'moderator';

  useEffect(() => {
    if (isOpen && league._id) {
      fetchLeagueStats();
    }
  }, [isOpen, league._id]);

  const fetchLeagueStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}`);
      if (response.ok) {
        const data = await response.json();
        setLeagueStats(data);
      } else {
        setError('Failed to load league details');
      }
    } catch (err) {
      setError('Error loading league details');
      console.error('Error fetching league stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPointsAdjustment = async (playerId: string, points: number, reason: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/adjust-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          pointsAdjustment: points,
          reason
        }),
      });

      if (response.ok) {
        fetchLeagueStats();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a pontszám módosítása során', {
          context: 'Liga pontszám módosítása',
          error: errorData.error
        });
      }
    } catch (err) {
      showErrorToast('Hiba a pontszám módosítása során', {
        context: 'Liga pontszám módosítása',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba'
      });
      console.error('Error adjusting points:', err);
    }
  };

  const handleAddPlayerToLeague = async (player: any) => {
    try {
      let playerId = player._id;
      
      // If player is a guest or not in Player collection, create them first
      if (!playerId) {
        const createResponse = await fetch('/api/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: player.name }),
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          showErrorToast(errorData.error || 'Hiba a játékos létrehozása során', {
            context: 'Liga játékos létrehozása',
            error: errorData.error
          });
          return;
        }
        
        const createData = await createResponse.json();
        playerId = createData._id;
      }

      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerId,
          playerName: player.name
        }),
      });

      if (response.ok) {
        fetchLeagueStats();
        showSuccessToast('Játékos sikeresen hozzáadva a ligához!');
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a játékos hozzáadása során', {
          context: 'Liga játékos hozzáadása',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Error adding player to league:', error);
      showErrorToast('Hiba a játékos hozzáadása során', {
        context: 'Liga játékos hozzáadása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box max-w-4xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">{league.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            <IconX  color="white" />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <IconUsers size={32} />
            </div>
            <div className="stat-title">Játékosok</div>
            <div className="stat-value text-primary">{leagueStats?.totalPlayers || 0}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <IconTrophy size={32} />
            </div>
            <div className="stat-title">Versenyek</div>
            <div className="stat-value text-primary">{leagueStats?.totalTournaments || 0}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Átlag pont/verseny</div>
            <div className="stat-value">{leagueStats?.averagePointsPerTournament?.toFixed(1) || '0.0'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered mb-6">
          <button
            className={`tab tab-lg ${activeTab === 'leaderboard' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Ranglista
          </button>
          <button
            className={`tab tab-lg ${activeTab === 'tournaments' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
          >
            Versenyek
          </button>
          {canManage && (
            <button
              className={`tab tab-lg ${activeTab === 'settings' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Beállítások
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <>
              {activeTab === 'leaderboard' && (
                <LeaderboardTab
                  leaderboard={leagueStats?.leaderboard || []}
                  canManage={canManage}
                  onAdjustPoints={handleManualPointsAdjustment}
                  onAddPlayer={handleAddPlayerToLeague}
                  league={league}
                />
              )}
              {activeTab === 'tournaments' && (
                <TournamentsTab
                  tournaments={leagueStats?.league?.attachedTournaments || []}
                  canManage={canManage}
                  clubId={clubId}
                  leagueId={league._id!}
                  onTournamentAttached={fetchLeagueStats}
                />
              )}
              {activeTab === 'settings' && canManage && (
                <SettingsTab
                  league={league}
                  clubId={clubId}
                  onLeagueUpdated={onLeagueUpdated}
                  leagueStats={leagueStats}
                />
              )}
            </>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// Leaderboard Tab Component
interface LeaderboardTabProps {
  leaderboard: LeagueLeaderboard[];
  canManage: boolean;
  onAdjustPoints: (playerId: string, points: number, reason: string) => void;
  onAddPlayer: (player: any) => void;
  league: League;
}

function LeaderboardTab({ leaderboard, canManage, onAdjustPoints, onAddPlayer, league }: LeaderboardTabProps) {
  const [adjustingPlayer, setAdjustingPlayer] = useState<string | null>(null);
  const [adjustmentPoints, setAdjustmentPoints] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleAdjustment = (playerId: string) => {
    if (adjustmentPoints === 0 || !adjustmentReason.trim()) {
      showErrorToast('Kérlek add meg a pontszámot és az okot!', {
        context: 'Liga pontszám módosítása',
        showReportButton: false
      });
      return;
    }

    onAdjustPoints(playerId, adjustmentPoints, adjustmentReason);
    setAdjustingPlayer(null);
    setAdjustmentPoints(0);
    setAdjustmentReason('');
  };

  const handlePlayerSelected = async (player: any) => {
    onAddPlayer(player);
  };

  return (
    <div className="space-y-4">
      {/* League Description */}
      {league.description && (
        <div className="bg-base-200 p-4 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h5 className="font-semibold mb-2">Liga leírása</h5>
              <p className="text-sm text-base-content/80">
                {isDescriptionExpanded 
                  ? league.description 
                  : league.description.length > 50 
                    ? `${league.description.substring(0, 50)}...` 
                    : league.description
                }
              </p>
            </div>
            {league.description.length > 50 && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="btn btn-ghost btn-xs ml-2 flex-shrink-0"
              >
                {isDescriptionExpanded ? 'Összecsuk' : 'Bővebben...'}
              </button>
            )}
          </div>
        </div>
      )}

      {canManage && (
        <div className="bg-base-200 p-4 rounded-lg">
          <h5 className="font-semibold mb-3">Játékos hozzáadása a ligához</h5>
          <PlayerSearch
            onPlayerSelected={handlePlayerSelected}
            placeholder="Játékos keresése és hozzáadása..."
            clubId=""
            isForTournament={false}
          />
        </div>
      )}
      
      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-base-content/60">Még nincsenek játékosok a ranglistán</p>
          {canManage && (
            <p className="text-sm text-base-content/40 mt-2">
              Használd a fenti keresőt játékosok hozzáadásához
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Helyezés</th>
                <th>Játékos</th>
                <th>Pontok</th>
                <th>Versenyek</th>
                <th>Átlag helyezés</th>
                <th>Legjobb helyezés</th>
                {canManage && <th>Műveletek</th>}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.player._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{entry.position}</span>
                      {entry.position <= 3 && (
                        <div className={`badge ${
                          entry.position === 1 ? 'badge-warning' :
                          entry.position === 2 ? 'badge-neutral' :
                          'badge-accent'
                        }`}>
                          {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="font-medium">{entry.player.name}</td>
                  <td>
                    <span className="font-mono font-bold text-primary">
                      {entry.totalPoints}
                    </span>
                  </td>
                  <td>{entry.tournamentsPlayed}</td>
                  <td>{entry.averagePosition > 0 ? entry.averagePosition.toFixed(1) : '-'}</td>
                  <td>{entry.bestPosition > 0 ? entry.bestPosition : '-'}</td>
                  {canManage && (
                    <td>
                      {adjustingPlayer === entry.player._id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={adjustmentPoints}
                            onChange={(e) => setAdjustmentPoints(parseInt(e.target.value) || 0)}
                            className="input input-xs w-16"
                            placeholder="±pont"
                          />
                          <input
                            type="text"
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            className="input input-xs w-24"
                            placeholder="indok"
                          />
                          <button
                            onClick={() => handleAdjustment(entry.player._id)}
                            className="btn btn-success btn-xs"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setAdjustingPlayer(null)}
                            className="btn btn-error btn-xs"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdjustingPlayer(entry.player._id)}
                          className="btn btn-ghost btn-xs"
                          title="Pontok manuális módosítása"
                        >
                          <IconEdit size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Tournaments Tab Component
interface TournamentsTabProps {
  tournaments: any[];
  canManage: boolean;
  clubId: string;
  leagueId: string;
  onTournamentAttached: () => void;
}

function TournamentsTab({ tournaments, canManage}: TournamentsTabProps) {
  // Filter and validate tournaments
  const validTournaments = tournaments.filter((tournament: any) => 
    tournament && 
    tournament._id && 
    (tournament.tournamentSettings || tournament.name)
  );

  return (
    <div className="space-y-4">
      {validTournaments.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold mb-2">Még nincsenek versenyek</h3>
          <p className="text-base-content/60 mb-4">Ehhez a ligához még nem lettek versenyek csatolva</p>
          {canManage && (
            <div className="bg-base-200 p-4 rounded-lg">
              <p className="text-sm text-base-content/70 mb-2">
                <strong>Versenyek hozzáadása:</strong>
              </p>
              <ul className="text-sm text-base-content/60 space-y-1">
                <li>• Verseny létrehozásakor válaszd ki ezt a ligát</li>
                <li>• Vagy csatold hozzá egy meglévő versenyt</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validTournaments.map((tournament: any) => (
            <TournamentCard
              key={tournament._id}
              tournament={{
                _id: tournament._id,
                tournamentId: tournament.tournamentId || tournament._id,
                tournamentSettings: {
                  name: tournament.tournamentSettings?.name || tournament.name || 'Névtelen verseny',
                  startDate: tournament.tournamentSettings?.startDate || tournament.startDate,
                  location: tournament.tournamentSettings?.location || tournament.location,
                  type: tournament.tournamentSettings?.type || tournament.type,
                  entryFee: tournament.tournamentSettings?.entryFee || tournament.entryFee,
                  maxPlayers: tournament.tournamentSettings?.maxPlayers || tournament.maxPlayers,
                  registrationDeadline: tournament.tournamentSettings?.registrationDeadline || tournament.registrationDeadline,
                  status: tournament.tournamentSettings?.status || tournament.status || 'pending'
                },
                tournamentPlayers: tournament.tournamentPlayers || [],
                clubId: tournament.clubId || { name: '' }
              }}
              userRole={canManage ? 'moderator' : 'member'}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Tab Component
interface SettingsTabProps {
  league: League;
  clubId: string;
  onLeagueUpdated: () => void;
  leagueStats: LeagueStatsResponse | null;
}

function SettingsTab({ league, clubId, onLeagueUpdated, leagueStats }: SettingsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: league.name,
    description: league.description || '',
    pointsConfig: { ...league.pointsConfig }
  });
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'history'>('settings');

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditing(false);
        onLeagueUpdated();
        showSuccessToast('Liga beállítások sikeresen mentve!');
      } else {
        showErrorToast('Hiba a mentés során', {
          context: 'Liga beállítások mentése'
        });
      }
    } catch (error) {
      console.error('Error updating league:', error);
      showErrorToast('Hiba a mentés során', {
        context: 'Liga beállítások mentése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: league.name,
      description: league.description || '',
      pointsConfig: { ...league.pointsConfig }
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold">Liga Beállítások</h4>
        {!isEditing && activeSubTab === 'settings' ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary btn-sm gap-2"
          >
            <IconEdit className="w-4 h-4" />
            Szerkesztés
          </button>
        ) : isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              Mégse
            </button>
            <button
              onClick={handleSave}
              className="btn btn-success btn-sm"
              disabled={loading}
            >
              {loading ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Sub-tabs */}
      <div className="tabs tabs-bordered">
        <button
          className={`tab ${activeSubTab === 'settings' ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab('settings')}
        >
          Beállítások
        </button>
        <button
          className={`tab ${activeSubTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          Pontszámítás Történet
        </button>
      </div>

      {activeSubTab === 'history' ? (
        <div className="space-y-4">
          <h5 className="font-semibold">Pontszámítás Módosítások</h5>
          {leagueStats?.league?.players && leagueStats.league.players.length > 0 ? (
            <div className="space-y-4">
              {leagueStats.league.players.map((player: any) => {
                if (!player.manualAdjustments || player.manualAdjustments.length === 0) return null;
                console.log('Player manual adjustments:', player);
                return (
                  <div key={player.player._id} className="bg-base-200 p-4 rounded-lg">
                                          <div className="flex items-center justify-between mb-3">
                        <h6 className="font-medium">{player.player.name || player.player.username || 'Ismeretlen játékos'}</h6>
                        <span className="badge badge-primary badge-sm">
                          {player.manualAdjustments.length} módosítás
                        </span>
                      </div>
                    <div className="space-y-2">
                      {player.manualAdjustments.map((adjustment: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-base-100 p-3 rounded">
                          <div className="flex items-center gap-3">
                            <span className={`badge badge-sm ${
                              adjustment.points > 0 ? 'badge-success' : 'badge-error'
                            }`}>
                              {adjustment.points > 0 ? '+' : ''}{adjustment.points} pont
                            </span>
                            <div>
                              <div className="font-medium">{adjustment.reason}</div>
                              <div className="text-xs text-base-content/60">
                                {adjustment.points > 0 ? 'Pont hozzáadva' : 'Pont levonva'} {player.player.name || player.player.username || 'játékosnak'}
                              </div>
                            </div>
                          </div>
                          <div className="text-base-content/60 text-right">
                            <div className="flex items-center gap-1 text-xs">
                              <IconUser size={12} />
                              <span>{adjustment.adjustedBy?.name || adjustment.adjustedBy?.username || 'Ismeretlen'}</span>
                            </div>
                            <div className="text-xs">
                              {new Date(adjustment.adjustedAt).toLocaleDateString('hu-HU')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-base-content/60">Még nincsenek manuális pontszámítás módosítások</p>
            </div>
          )}
        </div>
      ) : isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Liga neve</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input input-bordered w-full"
              placeholder="Liga neve"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Leírás</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="textarea textarea-bordered w-full"
              placeholder="Liga leírása"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <h5 className="font-semibold">Pontszámítás beállítások</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Csoportkör kiesés pontjai</label>
                <input
                  type="number"
                  value={formData.pointsConfig.groupDropoutPoints}
                  onChange={(e) => setFormData({
                    ...formData,
                    pointsConfig: { ...formData.pointsConfig, groupDropoutPoints: parseInt(e.target.value) || 0 }
                  })}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Egyenes kiesés alappontjai</label>
                <input
                  type="number"
                  value={formData.pointsConfig.knockoutBasePoints}
                  onChange={(e) => setFormData({
                    ...formData,
                    pointsConfig: { ...formData.pointsConfig, knockoutBasePoints: parseInt(e.target.value) || 0 }
                  })}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Szorzó tényező</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.pointsConfig.knockoutMultiplier}
                  onChange={(e) => setFormData({
                    ...formData,
                    pointsConfig: { ...formData.pointsConfig, knockoutMultiplier: parseFloat(e.target.value) || 1.5 }
                  })}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Győztes bónusz pontjai</label>
                <input
                  type="number"
                  value={formData.pointsConfig.winnerBonus}
                  onChange={(e) => setFormData({
                    ...formData,
                    pointsConfig: { ...formData.pointsConfig, winnerBonus: parseInt(e.target.value) || 0 }
                  })}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Max egyenes kiesős körök</label>
                <input
                  type="number"
                  value={formData.pointsConfig.maxKnockoutRounds}
                  onChange={(e) => setFormData({
                    ...formData,
                    pointsConfig: { ...formData.pointsConfig, maxKnockoutRounds: parseInt(e.target.value) || 3 }
                  })}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h5 className="font-semibold mb-2">Liga információk</h5>
            <div className="bg-base-200 p-4 rounded-lg space-y-2 text-sm">
              <div><strong>Név:</strong> {league.name}</div>
              {league.description && <div><strong>Leírás:</strong> {league.description}</div>}
            </div>
          </div>
          
          <div>
            <h5 className="font-semibold mb-2">Jelenlegi Pontszámítás</h5>
            <div className="bg-base-200 p-4 rounded-lg space-y-2 text-sm">
              <div>Csoportkör kiesés: <span className="font-mono">{league.pointsConfig.groupDropoutPoints} pont</span></div>
              <div>Egyenes kiesés alappont: <span className="font-mono">{league.pointsConfig.knockoutBasePoints} pont</span></div>
              <div>Szorzó tényező: <span className="font-mono">{league.pointsConfig.knockoutMultiplier}x</span></div>
              <div>Győztes bónusz: <span className="font-mono">{league.pointsConfig.winnerBonus} pont</span></div>
              <div>Max egyenes kiesős körök: <span className="font-mono">{league.pointsConfig.maxKnockoutRounds}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
