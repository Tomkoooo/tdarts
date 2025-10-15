"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  IconTrophy, 
  IconUsers, 
  IconCalendar, 
  IconExternalLink, 
  IconSearch, 
  IconRefresh, 
  IconFilter, 
  IconBuilding,
  IconClock,
  IconTarget
} from '@tabler/icons-react';
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
  isDeleted: boolean;
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      pending: { color: 'badge-warning', label: 'Függőben' },
      active: { color: 'badge-info', label: 'Aktív' },
      'group-stage': { color: 'badge-info', label: 'Csoportkör' },
      knockout: { color: 'badge-primary', label: 'Kieséses' },
      finished: { color: 'badge-success', label: 'Befejezett' }
    };
    return configs[status] || { color: 'badge-ghost', label: status };
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; icon: any }> = {
      group: { label: 'Csoportos', icon: IconUsers },
      knockout: { label: 'Kieséses', icon: IconTarget },
      group_knockout: { label: 'Vegyes', icon: IconTrophy }
    };
    return configs[type] || { label: type, icon: IconTrophy };
  };

  const stats = {
    total: tournaments.length,
    active: tournaments.filter(t => t.status === 'active' || t.status === 'group-stage' || t.status === 'knockout').length,
    finished: tournaments.filter(t => t.status === 'finished').length,
    pending: tournaments.filter(t => t.status === 'pending').length,
    totalPlayers: tournaments.reduce((total, t) => total + t.playerCount, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-base-content/60">Versenyek betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning/20 via-warning/10 to-transparent border border-warning/30 p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
              <IconTrophy className="w-10 h-10 text-warning" />
              Verseny Kezelés
            </h1>
            <p className="text-base-content/70 text-lg">Versenyek áttekintése és kezelése</p>
          </div>
          
          <button 
            onClick={fetchTournaments}
            disabled={loading}
            className="btn btn-warning gap-2"
          >
            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconTrophy className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Összes</h3>
          <p className="text-4xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-info/20 to-info/5 border border-info/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconClock className="w-7 h-7 text-info" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Aktív</h3>
          <p className="text-4xl font-bold text-info">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconTrophy className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Befejezett</h3>
          <p className="text-4xl font-bold text-success">{stats.finished}</p>
        </div>
        <div className="bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconClock className="w-7 h-7 text-warning" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Függőben</h3>
          <p className="text-4xl font-bold text-warning">{stats.pending}</p>
        </div>
        <div className="bg-gradient-to-br from-error/20 to-error/5 border border-error/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconUsers className="w-7 h-7 text-error" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Játékosok</h3>
          <p className="text-4xl font-bold text-error">{stats.totalPlayers}</p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <DailyChart
          title="Versenyek napi indítása"
          apiEndpoint="/api/admin/charts/tournaments/daily"
          color="warning"
          icon=""
        />
      </div>

      {/* Filters */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconFilter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Szűrők</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Keresés</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Keresés név, leírás vagy klub alapján..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <IconSearch className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Státusz</span>
            </label>
            <select 
              className="select select-bordered w-full"
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

      {/* Tournaments List */}
      {filteredTournaments.length === 0 ? (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconTrophy className="w-10 h-10 text-base-content/30" />
          </div>
          <h3 className="text-xl font-bold text-base-content mb-2">Nincsenek versenyek</h3>
          <p className="text-base-content/60">
            {searchTerm || statusFilter !== 'all'
              ? 'Nincsenek versenyek a megadott feltételekkel.'
              : 'Még nincsenek versenyek.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTournaments.map(tournament => {
            const statusConfig = getStatusConfig(tournament.status);
            const typeConfig = getTypeConfig(tournament.tournamentType);
            return (
              <div key={tournament._id} className="bg-base-100 border border-base-300 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconTrophy className="w-6 h-6 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-base-content mb-2 break-words">{tournament.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`badge ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          <span className="badge badge-outline gap-1">
                            <typeConfig.icon size={14} />
                            {typeConfig.label}
                          </span>
                          {tournament.isDeleted && (
                            <span className="badge badge-error">Törölve</span>
                          )}
                        </div>
                        {tournament.description && (
                          <p className="text-sm text-base-content/70 mb-3 line-clamp-2">{tournament.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-base-content/70">
                        <IconBuilding size={16} className="text-primary" />
                        <span className="truncate">{tournament.clubId.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-base-content/70">
                        <IconUsers size={16} className="text-info" />
                        <span>{tournament.playerCount} játékos</span>
                      </div>
                      <div className="flex items-center gap-2 text-base-content/70">
                        <IconCalendar size={16} className="text-warning" />
                        <span>{new Date(tournament.startDate).toLocaleDateString('hu-HU')}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/tournaments/${tournament.tournamentId}`}
                    className="btn btn-primary gap-2 flex-shrink-0"
                    target="_blank"
                  >
                    <IconExternalLink size={18} />
                    Megnyitás
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
