"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  IconBuilding, 
  IconUsers, 
  IconTrophy, 
  IconExternalLink, 
  IconSearch, 
  IconRefresh, 
  IconMapPin, 
  IconCalendar,
  IconShield,
  IconStar
} from '@tabler/icons-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import DailyChart from '@/components/admin/DailyChart';

interface AdminClub {
  _id: string;
  name: string;
  description?: string;
  location: string;
  subscriptionModel?: 'free' | 'basic' | 'pro' | 'enterprise';
  members: any[];
  tournaments: any[];
  createdAt: string;
  isDeleted: boolean;
  memberCount: number;
  tournamentCount: number;
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/clubs');
      setClubs(response.data.clubs);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast.error('Hiba történt a klubok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (club.description && club.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: clubs.length,
    active: clubs.filter(c => !c.isDeleted).length,
    deleted: clubs.filter(c => c.isDeleted).length,
    totalMembers: clubs.reduce((total, club) => total + club.memberCount, 0),
    totalTournaments: clubs.reduce((total, club) => total + club.tournamentCount, 0)
  };

  const getSubscriptionBadge = (model?: string) => {
    switch (model) {
      case 'enterprise':
        return { color: 'badge-error', label: 'Enterprise', icon: IconStar };
      case 'pro':
        return { color: 'badge-warning', label: 'Pro', icon: IconShield };
      case 'basic':
        return { color: 'badge-info', label: 'Basic', icon: IconBuilding };
      default:
        return { color: 'badge-success', label: 'Free', icon: IconBuilding };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-base-content/60">Klubok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/20 via-success/10 to-transparent border border-success/30 p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
              <IconBuilding className="w-10 h-10 text-success" />
              Klub Kezelés
            </h1>
            <p className="text-base-content/70 text-lg">Klubok áttekintése és kezelése</p>
          </div>
          
          <button 
            onClick={fetchClubs}
            disabled={loading}
            className="btn btn-success gap-2"
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
            <IconBuilding className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Összes Klub</h3>
          <p className="text-4xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconBuilding className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Aktív Klubok</h3>
          <p className="text-4xl font-bold text-success">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-error/20 to-error/5 border border-error/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconBuilding className="w-7 h-7 text-error" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Törölt</h3>
          <p className="text-4xl font-bold text-error">{stats.deleted}</p>
        </div>
        <div className="bg-gradient-to-br from-info/20 to-info/5 border border-info/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconUsers className="w-7 h-7 text-info" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Tagok</h3>
          <p className="text-4xl font-bold text-info">{stats.totalMembers}</p>
        </div>
        <div className="bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconTrophy className="w-7 h-7 text-warning" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Versenyek</h3>
          <p className="text-4xl font-bold text-warning">{stats.totalTournaments}</p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <DailyChart
          title="Klubok napi létrehozása"
          apiEndpoint="/api/admin/charts/clubs/daily"
          color="secondary"
          icon="🏢"
        />
      </div>

      {/* Search */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-bold">Keresés</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Keresés név, helyszín vagy leírás alapján..."
              className="input input-bordered w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <IconSearch className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          </div>
        </div>
      </div>

      {/* Clubs Grid */}
      {filteredClubs.length === 0 ? (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconBuilding className="w-10 h-10 text-base-content/30" />
          </div>
          <h3 className="text-xl font-bold text-base-content mb-2">Nincsenek klubok</h3>
          <p className="text-base-content/60">
            {searchTerm 
              ? 'Nincsenek klubok a megadott feltételekkel.'
              : 'Még nincsenek regisztrált klubok.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map(club => {
            const subBadge = getSubscriptionBadge(club.subscriptionModel);
            return (
              <div key={club._id} className="bg-base-100 border border-base-300 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-base-content mb-2 group-hover:text-primary transition-colors truncate">
                      {club.name}
                    </h2>
                    <div className="flex items-center gap-2 text-base-content/60 mb-3">
                      <IconMapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{club.location}</span>
                    </div>
                  </div>
                  {club.isDeleted && (
                    <span className="badge badge-error gap-1 flex-shrink-0">Törölve</span>
                  )}
                </div>

                {club.description && (
                  <p className="text-sm text-base-content/70 mb-4 line-clamp-2 leading-relaxed">
                    {club.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center">
                      <IconUsers className="w-4 h-4 text-info" />
                    </div>
                    <span className="font-bold">{club.memberCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                      <IconTrophy className="w-4 h-4 text-warning" />
                    </div>
                    <span className="font-bold">{club.tournamentCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 pb-4 border-b border-base-300">
                  <span className={`badge ${subBadge.color} gap-1`}>
                    <subBadge.icon size={14} />
                    {subBadge.label}
                  </span>
                  <Link
                    href={`/clubs/${club._id}`}
                    className="btn btn-primary btn-sm gap-2"
                    target="_blank"
                  >
                    <IconExternalLink size={16} />
                    Megnyitás
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-xs text-base-content/50">
                  <IconCalendar size={14} />
                  <span>{new Date(club.createdAt).toLocaleDateString('hu-HU')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
