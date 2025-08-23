"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconTrophy, IconUsers, IconCalendar, IconExternalLink, IconSearch, IconRefresh, IconFilter, IconBuilding } from '@tabler/icons-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import DailyChart from '@/components/admin/DailyChart';

interface AdminTournament {
  _id: string;
  name: string;
  tournamentId: string;
  description?: string;
  status: 'pending' | 'active' | 'finished' | 'group-stage' | 'knockout';
  tournamentType: 'group' | 'knockout' | 'group_knockout';
  startDate: string;
  endDate?: string;
  playerCount: number;
  clubId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  isDeleted: boolean; // Always returned by API with default false
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/tournaments');
      setTournaments(response.data.tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Hiba történt a versenyek betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tournament.description && tournament.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         tournament.clubId.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'admin-badge-warning',
      active: 'admin-badge-info',
      'group-stage': 'admin-badge-info',
      knockout: 'admin-badge-info',
      finished: 'admin-badge-secondary'
    };
    return colors[status] || 'admin-badge-outline';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Függőben',
      active: 'Aktív',
      'group-stage': 'Csoportkör',
      knockout: 'Kieséses',
      finished: 'Befejezett'
    };
    return texts[status] || status;
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      group_knockout: 'Csoport + Kiesés',
      knockout: 'Kiesés',
      group: 'Csoport'
    };
    return texts[type] || type;
  };

  const stats = {
    total: tournaments.length,
    pending: tournaments.filter(t => t.status === 'pending').length,
    ongoing: tournaments.filter(t => t.status === 'active' || t.status === 'group-stage' || t.status === 'knockout').length,
    completed: tournaments.filter(t => t.status === 'finished').length,
    cancelled: 0, // No cancelled status in the actual schema
    totalPlayers: tournaments.reduce((total, t) => total + t.playerCount, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Versenyek betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-red mb-2">Verseny Kezelés</h1>
          <p className="text-base-content/60">Versenyek áttekintése és kezelése</p>
        </div>
        <button 
          onClick={fetchTournaments}
          className="admin-btn-primary text-sm flex items-center gap-2"
          disabled={loading}
        >
          <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconTrophy className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Verseny</h3>
          <p className="text-3xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconCalendar className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Függőben</h3>
          <p className="text-3xl font-bold text-primary">{stats.pending}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconTrophy className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Folyamatban</h3>
          <p className="text-3xl font-bold text-primary">{stats.ongoing}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconTrophy className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Befejezett</h3>
          <p className="text-3xl font-bold text-primary">{stats.completed}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconTrophy className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Befejezett</h3>
          <p className="text-3xl font-bold text-primary">{stats.completed}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconUsers className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Játékos</h3>
          <p className="text-3xl font-bold text-primary">{stats.totalPlayers}</p>
        </div>
      </div>

      {/* Daily Chart */}
      <DailyChart
        title="Versenyek napi létrehozása"
        apiEndpoint="/api/admin/charts/tournaments/daily"
        color="accent"
        icon="🏆"
      />

      {/* Filters */}
      <div className="admin-glass-card">
        <div className="flex flex-col gap-4">
          <div className="form-control flex-1">
            <div className="input-group flex gap-2">
              <span className="flex items-center justify-center">
                <IconSearch className="w-4 h-4 text-primary" />
              </span>
              <input
                type="text"
                placeholder="Keresés név, leírás vagy klub alapján..."
                className="admin-input rounded-l-none border-l-0 flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="form-control">
            <div className="input-group flex gap-2">
              <span className="flex items-center justify-center">
                <IconFilter className="w-4 h-4 text-primary" />
              </span>
              <select 
                className="admin-select rounded-l-none border-l-0"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Összes státusz</option>
                <option value="pending">Függőben</option>
                <option value="active">Aktív</option>
                <option value="group-stage">Csoportkör</option>
                <option value="knockout">Kieséses</option>
                <option value="finished">Befejezett</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tournaments Table */}
      <div className="admin-glass-card">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="border-b border-base-300">
                <th className="text-base-content font-semibold">Név</th>
                <th className="text-base-content font-semibold">Klub</th>
                <th className="text-base-content font-semibold">Típus</th>
                <th className="text-base-content font-semibold">Státusz</th>
                <th className="text-base-content font-semibold">Játékosok</th>
                <th className="text-base-content font-semibold">Kezdés</th>
                <th className="text-base-content font-semibold">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {filteredTournaments.map(tournament => (
                <tr key={tournament._id} className="hover:bg-base-200/30 transition-colors">
                  <td>
                    <div>
                      <div className="font-medium text-base-content">{tournament.name}</div>
                      {tournament.description && (
                        <div className="text-xs text-base-content/60 line-clamp-1">
                          {tournament.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-secondary/10">
                        <IconBuilding className="w-3 h-3 text-secondary" />
                      </div>
                      <span className="text-base-content/80">{tournament.clubId.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="admin-badge-outline text-xs">
                      {getTypeText(tournament.tournamentType)}
                    </span>
                  </td>
                  <td>
                    <span className={`${getStatusColor(tournament.status)} text-xs`}>
                      {getStatusText(tournament.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-accent/10">
                        <IconUsers className="w-3 h-3 text-accent" />
                      </div>
                      <span className="font-medium text-base-content">{tournament.playerCount}</span>
                    </div>
                  </td>
                  <td className="text-base-content/70 text-sm">
                    {new Date(tournament.startDate).toLocaleDateString('hu-HU')}
                  </td>
                  <td>
                    <Link
                      href={`/tournaments/${tournament.tournamentId}`}
                      className="admin-btn-primary text-xs px-3 py-1 gap-2 inline-flex items-center"
                      target="_blank"
                    >
                      <IconExternalLink className="w-3 h-3" />
                      Megnyitás
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTournaments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-base-content/20 text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold text-base-content mb-2">Nincsenek versenyek</h3>
              <p className="text-base-content/60">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nincsenek versenyek a megadott feltételekkel.'
                  : 'Még nincsenek létrehozott versenyek.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
