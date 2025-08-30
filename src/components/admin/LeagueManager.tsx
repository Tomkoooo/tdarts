'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';

// Ikonok
const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconTrophy = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

// Validációs sémák
const createLeagueSchema = z.object({
  name: z.string().min(1, 'Név megadása kötelező').max(100, 'Név maximum 100 karakter lehet'),
  description: z.string().max(500, 'Leírás maximum 500 karakter lehet').optional(),
  scoringSystem: z.object({
    groupStage: z.object({
      eliminated: z.number().min(0, 'Pontok nem lehetnek negatívak')
    }),
    knockoutStage: z.object({
      round1: z.number().min(0),
      round2: z.number().min(0),
      round3: z.number().min(0),
      quarterFinal: z.number().min(0),
      semiFinal: z.number().min(0),
      finalist: z.number().min(0),
      winner: z.number().min(0)
    })
  }),
  settings: z.object({
    allowManualPoints: z.boolean(),
    allowExistingPoints: z.boolean(),
    autoCalculateStandings: z.boolean()
  })
});

type CreateLeagueData = z.infer<typeof createLeagueSchema>;

interface League {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  scoringSystem: {
    groupStage: { eliminated: number };
    knockoutStage: {
      round1: number;
      round2: number;
      round3: number;
      quarterFinal: number;
      semiFinal: number;
      finalist: number;
      winner: number;
    };
  };
  settings: {
    allowManualPoints: boolean;
    allowExistingPoints: boolean;
    autoCalculateStandings: boolean;
  };
  tournaments: string[];
  createdAt: string;
}

interface LeagueManagerProps {
  clubId: string;
}

export default function LeagueManager({ clubId }: LeagueManagerProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateLeagueData>({
    resolver: zodResolver(createLeagueSchema),
    defaultValues: {
      scoringSystem: {
        groupStage: { eliminated: 0 },
        knockoutStage: {
          round1: 1,
          round2: 2,
          round3: 3,
          quarterFinal: 5,
          semiFinal: 8,
          finalist: 12,
          winner: 20
        }
      },
      settings: {
        allowManualPoints: true,
        allowExistingPoints: true,
        autoCalculateStandings: true
      }
    }
  });

  // Ligák betöltése
  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/leagues?clubId=${clubId}`);
      if (response.data.success) {
        setLeagues(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Hiba történt a ligák betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, [clubId]);

  // Liga létrehozása
  const onSubmit = async (data: CreateLeagueData) => {
    try {
      setError(null);
      const response = await axios.post('/api/leagues', {
        ...data,
        clubId
      });

      if (response.data.success) {
        setShowCreateModal(false);
        reset();
        fetchLeagues();
      }
    } catch (error: any) {
      console.error('Error creating league:', error);
      setError(error.response?.data?.error || 'Hiba történt a liga létrehozásakor');
    }
  };

  // Liga szerkesztése
  const handleEdit = (league: League) => {
    setEditingLeague(league);
    reset({
      name: league.name,
      description: league.description,
      scoringSystem: league.scoringSystem,
      settings: league.settings
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
          <IconTrophy />
          Liga Kezelés
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn-primary btn-sm"
        >
          <IconPlus />
          Új Liga
        </button>
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

      {/* Liga lista */}
      {leagues.length === 0 ? (
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
            <IconPlus />
            Első Liga Létrehozása
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <div key={league._id} className="admin-glass-card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-base-content">{league.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(league)}
                    className="admin-btn-secondary btn-xs"
                    title="Szerkesztés"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(league._id)}
                    className="admin-btn-error btn-xs"
                    title="Törlés"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              {league.description && (
                <p className="text-base-content/70 text-sm mb-3">{league.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Csoportkör kiesők:</span>
                  <span className="font-semibold">{league.scoringSystem.groupStage.eliminated} pont</span>
                </div>
                <div className="flex justify-between">
                  <span>Győztes:</span>
                  <span className="font-semibold text-success">{league.scoringSystem.knockoutStage.winner} pont</span>
                </div>
                <div className="flex justify-between">
                  <span>Versenyek:</span>
                  <span className="font-semibold">{league.tournaments.length}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-base-300">
                <div className="flex gap-2">
                  <span className={`badge ${league.isActive ? 'admin-badge-success' : 'admin-badge-error'}`}>
                    {league.isActive ? 'Aktív' : 'Inaktív'}
                  </span>
                  {league.settings.allowManualPoints && (
                    <span className="badge admin-badge-info">Manuális pontok</span>
                  )}
                  {league.settings.allowExistingPoints && (
                    <span className="badge admin-badge-warning">Meglévő pontok</span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <span className="text-error text-sm">{errors.name.message}</span>
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
                    <span className="text-error text-sm">{errors.description.message}</span>
                  )}
                </div>
              </div>

              {/* Pontozási rendszer */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content">Pontozási Rendszer</h4>
                
                {/* Csoportkör */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Csoportkörben kiesők pontja</span>
                  </label>
                  <input
                    {...register('scoringSystem.groupStage.eliminated', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="admin-input"
                  />
                </div>

                {/* Kieséses szakasz */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">1. kör</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.round1', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">2. kör</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.round2', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">3. kör</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.round3', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Negyeddöntő</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.quarterFinal', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Elődöntő</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.semiFinal', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Döntős</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.finalist', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Győztes</span>
                    </label>
                    <input
                      {...register('scoringSystem.knockoutStage.winner', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>

              {/* Beállítások */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base-content">Beállítások</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      {...register('settings.allowManualPoints')}
                      type="checkbox"
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">Manuális pontok engedélyezése</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      {...register('settings.allowExistingPoints')}
                      type="checkbox"
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">Meglévő pontok felvitele</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      {...register('settings.autoCalculateStandings')}
                      type="checkbox"
                      className="checkbox checkbox-primary"
                    />
                    <span className="label-text">Automatikus állás számítás</span>
                  </label>
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
