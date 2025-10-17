'use client';
import React, { useState, useEffect } from 'react';
import { IconX, IconTrophy, IconUsers, IconEdit, IconUser, IconTrash, IconShare } from '@tabler/icons-react';
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/clubs/${clubId}?page=leagues&league=${league._id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${league.name} - Liga`,
          text: `Nézd meg ezt a ligát: ${league.name}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast('Liga link másolva a vágólapra!');
      }
    } catch (error) {
      // Fallback: copy to clipboard
      console.error('Error sharing league:', error);
      try {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast('Liga link másolva a vágólapra!');
      } catch (clipboardError) {
        showErrorToast('Nem sikerült másolni a linket');
        console.error('Error copying link to clipboard:', clipboardError);
      }
    }
  };

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
      const playerName = player.name;
      
      console.log('Adding player to league:', { player, playerId, playerName });
      
      // If player is a guest or not in Player collection, create them first
      if (!playerId) {
        console.log('Player has no ID, creating new player...');
        const createResponse = await fetch('/api/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: playerName }),
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Error creating player:', errorData);
          showErrorToast(errorData.error || 'Hiba a játékos létrehozása során', {
            context: 'Liga játékos létrehozása',
            error: errorData.error
          });
          return;
        }
        
        const createData = await createResponse.json();
        playerId = createData._id;
        console.log('Player created with ID:', playerId);
      }

      console.log('Adding player to league with ID:', playerId, 'Name:', playerName);

      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerId,
          playerName: playerName
        }),
      });

      if (response.ok) {
        fetchLeagueStats();
        showSuccessToast('Játékos sikeresen hozzáadva a ligához!');
      } else {
        const errorData = await response.json();
        console.error('Error adding player to league:', errorData);
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

  const handleRemovePlayerFromLeague = async (playerId: string, playerName: string, reason: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/players/${playerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason
        }),
      });

      if (response.ok) {
        fetchLeagueStats();
        showSuccessToast(`${playerName} sikeresen eltávolítva a ligából!`);
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a játékos eltávolítása során', {
          context: 'Liga játékos eltávolítása',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Error removing player from league:', error);
      showErrorToast('Hiba a játékos eltávolítása során', {
        context: 'Liga játékos eltávolítása',
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="btn btn-ghost btn-sm"
              title="Liga megosztása"
            >
              <IconShare size={18} />
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <IconX  color="white" />
            </button>
          </div>
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
                  onRemovePlayer={handleRemovePlayerFromLeague}
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
  onRemovePlayer: (playerId: string, playerName: string, reason: string) => void;
  league: League;
}

function LeaderboardTab({ leaderboard, canManage, onAdjustPoints, onAddPlayer, onRemovePlayer, league }: LeaderboardTabProps) {
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string; currentPoints: number } | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<'adjust' | 'set'>('adjust');
  const [adjustmentPoints, setAdjustmentPoints] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [removeReason, setRemoveReason] = useState<string>('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const openAdjustModal = (playerId: string, playerName: string, currentPoints: number) => {
    setSelectedPlayer({ id: playerId, name: playerName, currentPoints });
    setAdjustmentPoints('');
    setAdjustmentReason('');
    setAdjustmentMode('adjust');
    setShowAdjustModal(true);
  };

  const closeAdjustModal = () => {
    setShowAdjustModal(false);
    setSelectedPlayer(null);
    setAdjustmentPoints('');
    setAdjustmentReason('');
    setAdjustmentMode('adjust');
  };

  const openRemoveModal = (playerId: string, playerName: string, currentPoints: number) => {
    setSelectedPlayer({ id: playerId, name: playerName, currentPoints });
    setRemoveReason('');
    setShowRemoveModal(true);
  };

  const closeRemoveModal = () => {
    setShowRemoveModal(false);
    setSelectedPlayer(null);
    setRemoveReason('');
  };

  const handleRemovePlayer = () => {
    if (!selectedPlayer) return;
    
    if (!removeReason.trim()) {
      showErrorToast('Kérlek add meg az eltávolítás okát!', {
        context: 'Liga játékos eltávolítása',
        showReportButton: false
      });
      return;
    }

    onRemovePlayer(selectedPlayer.id, selectedPlayer.name, removeReason);
    closeRemoveModal();
  };

  const handleAdjustment = () => {
    if (!selectedPlayer) return;
    
    const inputValue = parseInt(adjustmentPoints);
    
    if (isNaN(inputValue)) {
      showErrorToast('Kérlek adj meg egy érvényes pontszámot!', {
        context: 'Liga pontszám módosítása',
        showReportButton: false
      });
      return;
    }

    if (!adjustmentReason.trim()) {
      showErrorToast('Kérlek add meg az okot!', {
        context: 'Liga pontszám módosítása',
        showReportButton: false
      });
      return;
    }

    // Calculate adjustment based on mode
    let pointsToAdjust = inputValue;
    if (adjustmentMode === 'set') {
      // Calculate difference: new target - current points
      pointsToAdjust = inputValue - selectedPlayer.currentPoints;
      
      if (pointsToAdjust === 0) {
        showErrorToast('Az új pontszám megegyezik a jelenlegivel!', {
          context: 'Liga pontszám módosítása',
          showReportButton: false
        });
        return;
      }
    } else {
      // Adjust mode - check if not 0
      if (pointsToAdjust === 0) {
        showErrorToast('A pontszám változás nem lehet 0!', {
          context: 'Liga pontszám módosítása',
          showReportButton: false
        });
        return;
      }
    }

    onAdjustPoints(selectedPlayer.id, pointsToAdjust, adjustmentReason);
    closeAdjustModal();
    showSuccessToast('Pontszám sikeresen módosítva!');
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
        <>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                  <th className="text-xs sm:text-sm">#</th>
                  <th className="text-xs sm:text-sm">Játékos</th>
                  <th className="text-xs sm:text-sm">Pont</th>
                  <th className="text-xs sm:text-sm hidden sm:table-cell">Versenyek</th>
                  <th className="text-xs sm:text-sm hidden md:table-cell">Átlag hely</th>
                  <th className="text-xs sm:text-sm hidden md:table-cell">Legjobb</th>
                  <th className="text-xs sm:text-sm hidden lg:table-cell">Dobás átlag</th>
                  {canManage && <th className="text-xs sm:text-sm"></th>}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.player._id}>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs sm:text-sm">{entry.position}</span>
                      {entry.position <= 3 && (
                          <span className="text-xs">
                          {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'}
                          </span>
                      )}
                    </div>
                  </td>
                    <td className="font-medium text-xs sm:text-sm py-2">
                      <div className="truncate max-w-[120px] sm:max-w-[200px]" title={entry.player.name}>
                        {entry.player.name}
                      </div>
                    </td>
                    <td className="py-2">
                      <span className="font-mono font-bold text-primary text-xs sm:text-sm">
                      {entry.totalPoints}
                    </span>
                  </td>
                    <td className="hidden sm:table-cell text-xs sm:text-sm py-2">{entry.tournamentsPlayed}</td>
                    <td className="hidden md:table-cell text-xs sm:text-sm py-2">{entry.averagePosition > 0 ? entry.averagePosition.toFixed(1) : '-'}</td>
                    <td className="hidden md:table-cell text-xs sm:text-sm py-2">{entry.bestPosition > 0 ? entry.bestPosition : '-'}</td>
                    <td className="hidden lg:table-cell text-xs sm:text-sm py-2">
                      {entry.leagueAverage && entry.leagueAverage > 0 ? (
                        <span className="font-mono font-semibold text-accent">{entry.leagueAverage.toFixed(2)}</span>
                      ) : '-'}
                    </td>
                  {canManage && (
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openAdjustModal(entry.player._id, entry.player.name, entry.totalPoints)}
                            className="btn btn-ghost btn-xs"
                            title="Pontok módosítása"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            onClick={() => openRemoveModal(entry.player._id, entry.player.name, entry.totalPoints)}
                            className="btn btn-ghost btn-xs text-error"
                            title="Játékos eltávolítása"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Remove Player Modal */}
          {showRemoveModal && selectedPlayer && (
            <dialog open className="modal modal-bottom sm:modal-middle">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-2 text-error">Játékos eltávolítása</h3>
                <div className="alert alert-warning mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm">
                    Ez a művelet eltávolítja a játékost a ligából, de visszavonható lesz.
                  </span>
                </div>
                <p className="text-sm text-base-content/70 mb-4">
                  Játékos: <span className="font-semibold">{selectedPlayer.name}</span>
                  <br />
                  Jelenlegi pont: <span className="font-mono font-bold text-primary">{selectedPlayer.currentPoints}</span>
                </p>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Eltávolítás oka</span>
                  </label>
                  <textarea
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    placeholder="Miért távolítod el ezt a játékost?"
                    rows={3}
                    autoFocus
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Ez az információ a történetben lesz tárolva
                    </span>
                  </label>
                </div>

                <div className="modal-action">
                  <button
                    onClick={closeRemoveModal}
                    className="btn btn-ghost"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={handleRemovePlayer}
                    className="btn btn-error"
                  >
                    Eltávolítás
                  </button>
                </div>
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={closeRemoveModal}>close</button>
              </form>
            </dialog>
          )}

          {/* Adjust Points Modal */}
          {showAdjustModal && selectedPlayer && (
            <dialog open className="modal modal-bottom sm:modal-middle">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-2">Pontszám módosítása</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Játékos: <span className="font-semibold">{selectedPlayer.name}</span>
                  <br />
                  Jelenlegi pont: <span className="font-mono font-bold text-primary">{selectedPlayer.currentPoints}</span>
                </p>
                
                {/* Mode Selector */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      setAdjustmentMode('adjust');
                      setAdjustmentPoints('');
                    }}
                    className={`btn btn-sm flex-1 ${adjustmentMode === 'adjust' ? 'btn-primary' : 'btn-outline'}`}
                  >
                    Módosítás (±)
                  </button>
                  <button
                    onClick={() => {
                      setAdjustmentMode('set');
                      setAdjustmentPoints('');
                    }}
                    className={`btn btn-sm flex-1 ${adjustmentMode === 'set' ? 'btn-primary' : 'btn-outline'}`}
                  >
                    Beállítás (=)
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        {adjustmentMode === 'adjust' ? 'Pontszám változás' : 'Új pontszám'}
                      </span>
                    </label>
                          <input
                      type="text"
                      inputMode="numeric"
                      pattern="-?[0-9]*"
                            value={adjustmentPoints}
                      onChange={(e) => {
                        const value = e.target.value;
                        const pattern = adjustmentMode === 'adjust' ? /^-?\d*$/ : /^\d*$/;
                        if (value === '' || (adjustmentMode === 'adjust' && value === '-') || pattern.test(value)) {
                          setAdjustmentPoints(value);
                        }
                      }}
                      className="input input-bordered w-full text-center text-lg"
                      placeholder={adjustmentMode === 'adjust' ? 'pl: +10 vagy -5' : 'pl: 100'}
                      autoFocus
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        {adjustmentMode === 'adjust' 
                          ? 'Pozitív (+) vagy negatív (-) szám' 
                          : `Új érték (most: ${selectedPlayer.currentPoints})`
                        }
                      </span>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Indoklás</span>
                    </label>
                          <input
                            type="text"
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="input input-bordered w-full"
                      placeholder="Miért módosítod a pontszámot?"
                    />
                  </div>

                  {/* Preview */}
                  {adjustmentPoints && !isNaN(parseInt(adjustmentPoints)) && (
                    <div className="alert alert-info">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="text-sm">
                        {adjustmentMode === 'adjust' ? (
                          <>
                            <strong>{selectedPlayer.currentPoints}</strong> 
                            {' → '}
                            <strong>{selectedPlayer.currentPoints + parseInt(adjustmentPoints)}</strong>
                            {' '}
                            ({parseInt(adjustmentPoints) > 0 ? '+' : ''}{adjustmentPoints} pont)
                          </>
                        ) : (
                          <>
                            <strong>{selectedPlayer.currentPoints}</strong>
                            {' → '}
                            <strong>{parseInt(adjustmentPoints)}</strong>
                            {' '}
                            ({(parseInt(adjustmentPoints) - selectedPlayer.currentPoints) > 0 ? '+' : ''}
                            {parseInt(adjustmentPoints) - selectedPlayer.currentPoints} pont)
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="modal-action">
                          <button
                    onClick={closeAdjustModal}
                    className="btn btn-ghost"
                          >
                    Mégse
                          </button>
                          <button
                    onClick={handleAdjustment}
                    className="btn btn-primary"
                          >
                    Mentés
                          </button>
                        </div>
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={closeAdjustModal}>close</button>
              </form>
            </dialog>
          )}
        </>
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

function TournamentsTab({ tournaments, canManage, clubId, leagueId, onTournamentAttached }: TournamentsTabProps) {
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showDetachModal, setShowDetachModal] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [tournamentToDetach, setTournamentToDetach] = useState<{ id: string; name: string } | null>(null);
  const [calculatePoints, setCalculatePoints] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // Filter and validate tournaments
  const validTournaments = tournaments.filter((tournament: any) => 
    tournament && 
    tournament._id && 
    (tournament.tournamentSettings || tournament.name)
  );

  const fetchAvailableTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/tournaments`);
      if (response.ok) {
        const data = await response.json();
        // Filter out tournaments that are already attached
        const attachedIds = tournaments.map(t => t._id);
        const available = data.tournaments.filter((t: any) => 
          !attachedIds.includes(t._id) && t.tournamentSettings.status === 'finished'
        );
        setAvailableTournaments(available);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      showErrorToast('Nem sikerült betölteni a versenyeket', {
        context: 'Verseny betöltése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachTournament = async () => {
    if (!selectedTournamentId) {
      showErrorToast('Kérlek válassz egy versenyt!', {
        context: 'Verseny hozzárendelése',
        showReportButton: false
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${leagueId}/attach-tournament`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: selectedTournamentId,
          calculatePoints
        }),
      });

      if (response.ok) {
        showSuccessToast(calculatePoints 
          ? 'Verseny sikeresen hozzárendelve pontszámítással!' 
          : 'Verseny sikeresen hozzárendelve (csak átlagok, pontszámítás nélkül)!'
        );
        setShowAttachModal(false);
        setSelectedTournamentId('');
        setCalculatePoints(false);
        onTournamentAttached();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a verseny hozzárendelése során', {
          context: 'Verseny hozzárendelése',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Error attaching tournament:', error);
      showErrorToast('Hiba a verseny hozzárendelése során', {
        context: 'Verseny hozzárendelése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDetachTournament = async () => {
    if (!tournamentToDetach) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${leagueId}/detach-tournament`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentToDetach.id
        }),
      });

      if (response.ok) {
        showSuccessToast('Verseny sikeresen eltávolítva a ligából és az automatikus pontok visszavonva!');
        setShowDetachModal(false);
        setTournamentToDetach(null);
        onTournamentAttached();
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a verseny eltávolítása során', {
          context: 'Verseny eltávolítása',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Error detaching tournament:', error);
      showErrorToast('Hiba a verseny eltávolítása során', {
        context: 'Verseny eltávolítása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              fetchAvailableTournaments();
              setShowAttachModal(true);
            }}
            className="btn btn-primary btn-sm gap-2"
          >
            <IconTrophy size={16} />
            Befejezett verseny hozzárendelése
          </button>
        </div>
      )}

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
              <ul className="text-sm text-base-content/60 space-y-1 text-left">
                <li>• <strong>Új verseny:</strong> Verseny létrehozásakor válaszd ki ezt a ligát (automatikus pontszámítás)</li>
                <li>• <strong>Befejezett verseny:</strong> Használd a fenti gombot befejezett verseny utólagos hozzárendeléséhez (csak átlagok)</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validTournaments.map((tournament: any) => (
            <div key={tournament._id} className="relative">
              <TournamentCard
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
              {canManage && (
                <button
                  onClick={() => {
                    setTournamentToDetach({
                      id: tournament._id,
                      name: tournament.tournamentSettings?.name || tournament.name || 'Névtelen verseny'
                    });
                    setShowDetachModal(true);
                  }}
                  className="absolute top-2 right-2 btn btn-error btn-xs gap-1"
                  title="Verseny eltávolítása a ligából"
                >
                  <IconX size={14} />
                  Eltávolítás
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attach Tournament Modal */}
      {showAttachModal && (
        <dialog open className="modal modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Befejezett verseny hozzárendelése</h3>
            
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold mb-1">Fontos információk:</p>
                <ul className="space-y-1">
                  <li>• Csak <strong>befejezett versenyek</strong> jelennek meg</li>
                  <li>• Az átlagok automatikusan kiszámításra kerülnek</li>
                  <li>• <strong>Pontszámítás</strong> csak új versenyek létrehozásakor történik automatikusan</li>
                  <li>• Már befejezett versenyeknél a pontszámítás nem javasolt</li>
                </ul>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Válassz versenyt</span>
                  </label>
                  <select
                    value={selectedTournamentId}
                    onChange={(e) => setSelectedTournamentId(e.target.value)}
                    className="select select-bordered w-full"
                  >
                    <option value="">Válassz...</option>
                    {availableTournaments.map((tournament: any) => (
                      <option key={tournament._id} value={tournament._id}>
                        {tournament.tournamentSettings.name} - {new Date(tournament.tournamentSettings.startDate).toLocaleDateString('hu-HU')}
                      </option>
                    ))}
                  </select>
                  {availableTournaments.length === 0 && (
                    <label className="label">
                      <span className="label-text-alt text-warning">Nincs elérhető befejezett verseny</span>
                    </label>
                  )}
                </div>

                <div className="form-control mb-4">
                  <label className="label cursor-pointer">
                    <span className="label-text">
                      <span className="font-medium">Pontszámítás engedélyezése</span>
                      <span className="block text-xs text-base-content/60 mt-1">
                        Nem javasolt már befejezett versenyeknél
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={calculatePoints}
                      onChange={(e) => setCalculatePoints(e.target.checked)}
                      className="checkbox checkbox-primary"
                    />
                  </label>
                </div>
              </>
            )}

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowAttachModal(false);
                  setSelectedTournamentId('');
                  setCalculatePoints(false);
                }}
                className="btn btn-ghost"
                disabled={loading}
              >
                Mégse
              </button>
              <button
                onClick={handleAttachTournament}
                className="btn btn-primary"
                disabled={loading || !selectedTournamentId}
              >
                {loading ? 'Hozzárendelés...' : 'Hozzárendelés'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setShowAttachModal(false);
              setSelectedTournamentId('');
              setCalculatePoints(false);
            }}>close</button>
          </form>
        </dialog>
      )}

      {/* Detach Tournament Confirmation Modal */}
      {showDetachModal && tournamentToDetach && (
        <dialog open className="modal modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Verseny eltávolítása</h3>
            
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold mb-1">Figyelem!</p>
                <p>Ez a művelet:</p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Eltávolítja a versenyt a ligából</li>
                  <li><strong>Visszavonja az összes automatikusan hozzáadott pontot</strong> ehhez a versenyhez</li>
                  <li>A manuális pontmódosítások megmaradnak</li>
                  <li>Az átlag számítás frissül</li>
                </ul>
              </div>
            </div>

            <p className="mb-4">
              Biztosan eltávolítod ezt a versenyt: <strong>{tournamentToDetach.name}</strong>?
            </p>

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowDetachModal(false);
                  setTournamentToDetach(null);
                }}
                className="btn btn-ghost"
                disabled={loading}
              >
                Mégse
              </button>
              <button
                onClick={handleDetachTournament}
                className="btn btn-error"
                disabled={loading}
              >
                {loading ? 'Eltávolítás...' : 'Eltávolítás'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setShowDetachModal(false);
              setTournamentToDetach(null);
            }}>close</button>
          </form>
        </dialog>
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

  const handleUndoAdjustment = async (playerId: string, adjustmentIndex: number) => {
    if (!confirm('Biztosan visszavonod ezt a pontszám módosítást?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/undo-adjustment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          adjustmentIndex
        }),
      });

      if (response.ok) {
        onLeagueUpdated();
        showSuccessToast('Pontszám módosítás visszavonva!');
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a visszavonás során', {
          context: 'Liga pontszám visszavonása',
          error: errorData.error
        });
      }
    } catch (error) {
      showErrorToast('Hiba a visszavonás során', {
        context: 'Liga pontszám visszavonása',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    }
  };

  const handleUndoRemoval = async (playerId: string, removalIndex: number) => {
    if (!confirm('Biztosan visszahelyezed ezt a játékost a ligába?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${league._id}/undo-removal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          removalIndex
        }),
      });

      if (response.ok) {
        onLeagueUpdated();
        showSuccessToast('Játékos visszahelyezve a ligába!');
      } else {
        const errorData = await response.json();
        showErrorToast(errorData.error || 'Hiba a visszahelyezés során', {
          context: 'Liga játékos visszahelyezése',
          error: errorData.error
        });
      }
    } catch (error) {
      showErrorToast('Hiba a visszahelyezés során', {
        context: 'Liga játékos visszahelyezése',
        error: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
    }
  };

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
        <div className="space-y-6">
          {/* Removed Players Section */}
          <div>
            <h5 className="font-semibold mb-3">Eltávolított Játékosok</h5>
            {leagueStats?.league?.removedPlayers && leagueStats.league.removedPlayers.length > 0 ? (
              <div className="space-y-2">
                {leagueStats.league.removedPlayers.map((removal: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm bg-base-200 p-3 rounded gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="badge badge-error badge-sm flex-shrink-0">
                        Eltávolítva
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{removal.player?.name || removal.player?.username || 'Ismeretlen játékos'}</div>
                        <div className="text-xs text-base-content/60">
                          {removal.totalPoints} pont • {removal.tournamentPoints?.length || 0} verseny • {removal.manualAdjustments?.length || 0} módosítás
                        </div>
                        <div className="text-xs text-base-content/50 italic">
                          {removal.reason}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-base-content/60 text-right">
                        <div className="flex items-center gap-1 text-xs">
                          <IconUser size={12} />
                          <span>{removal.removedBy?.name || removal.removedBy?.username || 'Ismeretlen'}</span>
                        </div>
                        <div className="text-xs">
                          {new Date(removal.removedAt).toLocaleDateString('hu-HU')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUndoRemoval(removal.player._id, index)}
                        className="btn btn-success btn-xs gap-1"
                        title="Visszahelyezés"
                      >
                        <IconUser size={12} />
                        <span className="hidden sm:inline">Visszahelyezés</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-base-200 rounded-lg">
                <p className="text-sm text-base-content/60">Még nem lett játékos eltávolítva</p>
              </div>
            )}
          </div>

          {/* Manual Adjustments Section */}
          <div>
            <h5 className="font-semibold mb-3">Pontszámítás Módosítások</h5>
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
                          <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm bg-base-100 p-3 rounded gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={`badge badge-sm flex-shrink-0 ${
                              adjustment.points > 0 ? 'badge-success' : 'badge-error'
                            }`}>
                              {adjustment.points > 0 ? '+' : ''}{adjustment.points} pont
                            </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{adjustment.reason}</div>
                              <div className="text-xs text-base-content/60">
                                {adjustment.points > 0 ? 'Pont hozzáadva' : 'Pont levonva'} {player.player.name || player.player.username || 'játékosnak'}
                              </div>
                            </div>
                          </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-base-content/60 text-right">
                            <div className="flex items-center gap-1 text-xs">
                              <IconUser size={12} />
                              <span>{adjustment.adjustedBy?.name || adjustment.adjustedBy?.username || 'Ismeretlen'}</span>
                            </div>
                            <div className="text-xs">
                              {new Date(adjustment.adjustedAt).toLocaleDateString('hu-HU')}
                            </div>
                              </div>
                              <button
                                onClick={() => handleUndoAdjustment(player.player._id, index)}
                                className="btn btn-error btn-xs gap-1"
                                title="Visszavonás"
                              >
                                <IconTrash size={12} />
                                <span className="hidden sm:inline">Visszavonás</span>
                              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
              <div className="text-center py-4 bg-base-200 rounded-lg">
                <p className="text-sm text-base-content/60">Még nincsenek manuális pontszámítás módosítások</p>
            </div>
          )}
          </div>
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
