'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { IconPlus, IconEdit, IconTrash, IconTrophy, IconChartBar, IconUserPlus } from '@tabler/icons-react';
import PlayerSearch from '../club/PlayerSearch';
import Link from 'next/link';

// Validációs sémák - Mértani sorozat verzió
const createLeagueSchema = z.object({
  name: z.string().min(1, 'Név megadása kötelező').max(100, 'Név maximum 100 karakter lehet'),
  description: z.string().max(500, 'Leírás maximum 500 karakter lehet').optional(),
  pointRules: z.object({
    groupDropout: z.number().min(0, 'Pontok nem lehetnek negatívak'),
    firstPlace: z.number().min(0, 'Pontok nem lehetnek negatívak'),
    multiplier: z.number().min(0.1, 'Szorzó minimum 0.1').max(2, 'Szorzó maximum 2')
  })
});

type CreateLeagueData = z.infer<typeof createLeagueSchema>;

interface League {
  _id: string;
  name: string;
  description?: string;
  pointRules: {
    groupDropout: number;
    firstPlace: number;
    multiplier: number;
  };
  tournaments: string[];
  players: {
    playerId: string;
    totalPoints: number;
    fromTournaments: {
      tournamentId: string;
      points: number;
    }[];
  }[];
  createdAt: string;
}

interface LeagueManagerProps {
  clubId: string;
  onLeagueSelect?: (league: League) => void;
}

export default function LeagueManager({ clubId, onLeagueSelect }: LeagueManagerProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openAddPlayerModal, setOpenAddPlayerModal] = useState<string | null>(null);
  const [leagueSystemAccess, setLeagueSystemAccess] = useState<{
    accessible: boolean;
    requiresSubscription: boolean;
    subscriptionModel?: string;
  }>({ accessible: false, requiresSubscription: true });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CreateLeagueData>({
    resolver: zodResolver(createLeagueSchema),
    defaultValues: {
      pointRules: {
        groupDropout: 1,
        firstPlace: 16,
        multiplier: 0.5
      }
    }
  });

  // Ligák betöltése
  const fetchLeagues = async () => {
    try {
      setLoading(true);
      
      // Feature flag ellenőrzés
      const featureFlagResponse = await axios.get(`/api/feature-flags/check?feature=leagueSystem&clubId=${clubId}`);
      setLeagueSystemAccess({
        accessible: featureFlagResponse.data.enabled,
        requiresSubscription: featureFlagResponse.data.requiresSubscription,
        subscriptionModel: featureFlagResponse.data.subscriptionModel
      });
      
      // Ligák betöltése csak akkor, ha nincs előfizetés szükség
      if (!featureFlagResponse.data.requiresSubscription) {
        try {
          const response = await axios.get(`/api/leagues?clubId=${clubId}`);
          if (response.data.success) {
            setLeagues(response.data.data);
          }
        } catch (leagueError) {
          console.error('Error fetching leagues:', leagueError);
          // Ne dobjunk hibát, csak logoljuk
        }
      }
    } catch (error) {
      console.error('Error checking feature flag:', error);
      setError('Hiba történt a funkció ellenőrzésekor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, [clubId]);

  // Liga létrehozása
  const onSubmit = async (data: any) => {
    try {
      setError(null);
      
      if (editingLeague) {
        // Szerkesztés
        const response = await axios.put(`/api/leagues/${editingLeague._id}`, {
          ...data,
          tournaments: editingLeague.tournaments
        });
        if (response.data.success) {
          setShowCreateModal(false);
          setEditingLeague(null);
          reset();
          fetchLeagues();
        }
      } else {
        // Új létrehozás
        const response = await axios.post('/api/leagues', {
          ...data,
          clubId
        });
        if (response.data.success) {
          setShowCreateModal(false);
          reset();
          fetchLeagues();
        }
      }
    } catch (error: any) {
      console.error('Error saving league:', error);
      setError(error.response?.data?.error || 'Hiba történt a liga mentésekor');
    }
  };

  // Liga szerkesztése
  const handleEdit = (league: League) => {
    setEditingLeague(league);
    reset({
      name: league.name,
      description: league.description,
      pointRules: league.pointRules
    });
    setShowCreateModal(true);
  };

  // Liga törlése
  const handleDelete = async (leagueId: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a ligát?')) return;

    try {
      const response = await axios.delete(`/api/leagues/${leagueId}`);
      if (response.data.success) {
        fetchLeagues();
      }
    } catch (error: any) {
      console.error('Error deleting league:', error);
      setError(error.response?.data?.error || 'Hiba történt a liga törlésekor');
    }
  };

  // Modal bezárása
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingLeague(null);
    reset();
    setError(null);
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

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-base-content flex items-center gap-2">
          <IconTrophy className="w-6 h-6" />
          Liga Kezelés
        </h2>
        {!leagueSystemAccess.requiresSubscription && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-btn-primary btn-sm"
          >
            <IconPlus className="w-4 h-4" />
            Új Liga
          </button>
        )}
      </div>

      {/* Hibaüzenet */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-sm btn-ghost">
            ✕
          </button>
        </div>
      )}

      {/* Liga lista vagy promo üzenet */}
      {leagueSystemAccess.requiresSubscription ? (
        <div className="admin-glass-card text-center py-12">
          <IconTrophy className="w-16 h-16 mx-auto text-primary mb-4" />
          <h3 className="text-2xl font-bold text-base-content mb-4">Liga Rendszer</h3>
          <p className="text-base-content/70 text-lg mb-6 max-w-2xl mx-auto">
            Indíts ligákat a klubodban! Versenyzők pontozása, rangsorok és automatikus pontszámítás.
          </p>
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 mb-6">
            <h4 className="text-lg font-semibold text-primary mb-3">Előfizetés szükséges</h4>
            <p className="text-base-content/70 mb-4">
              A ligák rendszer használatához Pro előfizetés szükséges.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                href="/#pricing" 
                className="admin-btn-primary btn-lg"
              >
                <IconTrophy className="w-5 h-5" />
                Előfizetés
              </Link>
              <button 
                onClick={() => window.open('/#pricing', '_blank')}
                className="admin-btn-secondary btn-lg"
              >
                Részletek
              </button>
            </div>
          </div>
          <p className="text-sm text-base-content/50">
            * A Pro csomag tartalmazza a ligák rendszert és további prémium funkciókat
          </p>
        </div>
      ) : leagues.length === 0 ? (
        <div className="admin-glass-card text-center py-12">
          <IconTrophy className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
          <h3 className="text-lg font-semibold text-base-content mb-2">Nincsenek ligák</h3>
          <p className="text-base-content/60 mb-4">
            Hozz létre egy új ligát a versenyzők pontozásához
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-btn-primary"
          >
            <IconPlus className="w-4 h-4" />
            Első Liga Létrehozása
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <div key={league._id} className="admin-glass-card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-base-content">{league.name}</h3>
                <button
                    onClick={() => setOpenAddPlayerModal(league._id)}
                    className="admin-btn-secondary btn-xs"
                    title="Játékos hozzáadása"
                >
                    <IconUserPlus className="w-4 h-4" 
                    title="Játékos hozzáadása"
                    />
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(league)}
                    className="admin-btn-secondary btn-xs"
                    title="Szerkesztés"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(league._id)}
                    className="admin-btn-error btn-xs"
                    title="Törlés"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {league.description && (
                <p className="text-base-content/70 text-sm mb-3">{league.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Csoportkör kiesők:</span>
                  <span className="font-semibold">{league.pointRules.groupDropout} pont</span>
                </div>
                <div className="flex justify-between">
                  <span>Győztes:</span>
                  <span className="font-semibold text-success">{league.pointRules.firstPlace} pont</span>
                </div>
                <div className="flex justify-between">
                  <span>Szorzó:</span>
                  <span className="font-semibold text-info">{league.pointRules.multiplier}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Versenyek:</span>
                  <span className="font-semibold">{league.tournaments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Játékosok:</span>
                  <span className="font-semibold">{league.players.length}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-base-300">
                <div className="flex gap-2">
                  <button
                    onClick={() => onLeagueSelect?.(league)}
                    className="admin-btn-info btn-xs"
                    title="Liga Állás Megtekintése"
                  >
                    <IconChartBar className="w-4 h-4" />
                    Állás
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {openAddPlayerModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              Liga játékosainak szerkesztése
            </h3>
            <div className="space-y-6">
              {/* Játékos hozzáadása */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Játékos hozzáadása</span>
                </label>
                <PlayerSearch
                  onPlayerSelected={async (player: any) => {
                    // Ellenőrizd, hogy már benne van-e
                    if (editingLeague?.players.some(p => p.playerId === player._id)) return;
                    // API hívás a hozzáadáshoz
                    await axios.post(`/api/leagues/${openAddPlayerModal}/players`, {
                      playerId: player._id,
                    });
                    // Frissítsd a ligákat
                    fetchLeagues();
                  }}
                  placeholder="Keress játékost név vagy felhasználónév alapján..."
                  className="w-full"
                  clubId={clubId}
                  isForTournament={false}
                  excludePlayerIds={editingLeague?.players.map(p => p.playerId) || []}
                />
              </div>

              {/* Játékosok listája */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Játékosok a ligában</span>
                </label>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Név</th>
                        <th>Pontok</th>
                        <th>Művelet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingLeague?.players.map((player, idx) => (
                        <tr key={player.playerId}>
                          <td>
                            {/* Itt lehetne részletesebb név, ha van user cache */}
                            <span className="font-semibold">{player.playerId}</span>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input input-bordered input-sm w-24"
                              value={player.totalPoints}
                              min={0}
                              onChange={async (e) => {
                                const newPoints = Number(e.target.value);
                                await axios.put(`/api/leagues/${openAddPlayerModal}/players/${player.playerId}`, {
                                  totalPoints: newPoints,
                                });
                                fetchLeagues();
                              }}
                            />
                          </td>
                          <td>
                            <button
                              className="admin-btn-danger btn-xs"
                              title="Játékos eltávolítása"
                              onClick={async () => {
                                await axios.delete(`/api/leagues/${openAddPlayerModal}/players/${player.playerId}`);
                                fetchLeagues();
                              }}
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {editingLeague?.players.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-base-content/60">
                            Nincs játékos a ligában.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="btn btn-ghost"
                  onClick={() => setOpenAddPlayerModal(null)}
                  type="button"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liga létrehozás/szerkesztés modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingLeague ? 'Liga Szerkesztése' : 'Új Liga Létrehozása'}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Alapadatok */}
              <div className="space-y-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Név *</span>
                  </label>
                  <input
                    {...register('name')}
                    className="admin-input"
                    placeholder="Liga neve"
                  />
                  {errors.name && (
                    <div className="mt-2">
                      <span className="text-error text-sm">{errors.name.message}</span>
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Leírás</span>
                  </label>
                  <input
                    {...register('description')}
                    className="admin-input"
                    placeholder="Opcionális leírás"
                  />
                  {errors.description && (
                    <div className="mt-2">
                      <span className="text-error text-sm">{errors.description.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pontozási rendszer */}
              <div className="space-y-6">
                <h4 className="font-semibold text-base-content">Pontozási Rendszer</h4>
                
                {/* Csoportkör */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Csoportkörben kiesők pontja</span>
                  </label>
                  <input
                    {...register('pointRules.groupDropout', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="admin-input"
                  />
                  <label className="label">
                    <span className="label-text-alt">Alap pont minden csoportkörben kieső játékosnak</span>
                  </label>
                </div>

                {/* Első hely */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Győztes pontja</span>
                  </label>
                  <input
                    {...register('pointRules.firstPlace', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="admin-input"
                  />
                  <label className="label">
                    <span className="label-text-alt">A győztes játékos pontszáma (legmagasabb pont)</span>
                  </label>
                </div>

                {/* Szorzó */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Szorzó (mértani sorozat)</span>
                  </label>
                  <input
                    {...register('pointRules.multiplier', { valueAsNumber: true })}
                    type="number"
                    min="0.1"
                    max="2"
                    step="0.1"
                    className="admin-input"
                  />
                  <label className="label">
                    <span className="label-text-alt">0.1 - 2.0 között. Kisebb érték = nagyobb különbség a körök között</span>
                  </label>
                </div>

                {/* Pontok előnézet */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Pontok előnézet</span>
                  </label>
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm text-base-content/70 mb-3">
                      Mértani sorozat alapján számított pontok (dinamikusan frissül):
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      <div className="text-center bg-primary/10 rounded-lg p-2">
                        <div className="font-bold text-primary">1. kör</div>
                        <div className="text-base-content/80 font-mono text-sm">
                          {Math.round((watch('pointRules.firstPlace') || 16) * Math.pow(watch('pointRules.multiplier') || 0.5, 5))}
                        </div>
                      </div>
                      <div className="text-center bg-primary/10 rounded-lg p-2">
                        <div className="font-bold text-primary">2. kör</div>
                        <div className="text-base-content/80 font-mono text-sm">
                          {Math.round((watch('pointRules.firstPlace') || 16) * Math.pow(watch('pointRules.multiplier') || 0.5, 4))}
                        </div>
                      </div>
                      <div className="text-center bg-primary/10 rounded-lg p-2">
                        <div className="font-bold text-primary">3. kör</div>
                        <div className="text-base-content/80 font-mono text-sm">
                          {Math.round((watch('pointRules.firstPlace') || 16) * Math.pow(watch('pointRules.multiplier') || 0.5, 3))}
                        </div>
                      </div>
                      <div className="text-center bg-primary/10 rounded-lg p-2">
                        <div className="font-bold text-primary">Elődöntő</div>
                        <div className="text-base-content/80 font-mono text-sm">
                          {Math.round((watch('pointRules.firstPlace') || 16) * Math.pow(watch('pointRules.multiplier') || 0.5, 2))}
                        </div>
                      </div>
                      <div className="text-center bg-primary/10 rounded-lg p-2">
                        <div className="font-bold text-primary">Döntő</div>
                        <div className="text-base-content/80 font-mono text-sm">
                          {Math.round((watch('pointRules.firstPlace') || 16) * (watch('pointRules.multiplier') || 0.5))}
                        </div>
                      </div>
                      <div className="text-center bg-success/10 rounded-lg p-2">
                        <div className="font-bold text-success">Győztes</div>
                        <div className="text-base-content/80 font-mono text-sm">
                          {watch('pointRules.firstPlace') || 16}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="text-xs text-base-content/60">
                        <strong>Mértani sorozat:</strong> 1. körből a győztesig növekednek a pontok ({watch('pointRules.multiplier') || 0.5}-szorosával)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal gombok */}
              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary"
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : editingLeague ? (
                    'Mentés'
                  ) : (
                    'Létrehozás'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
