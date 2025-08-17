"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconBuilding, IconUsers, IconTrophy, IconExternalLink, IconSearch, IconRefresh, IconMapPin, IconCalendar } from '@tabler/icons-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AdminClub {
  _id: string;
  name: string;
  description?: string;
  location: string;
  subscriptionModel?: 'free' | 'basic' | 'pro' | 'enterprise';
  members: any[]; // Always returned by API
  tournaments: any[]; // Always returned by API
  createdAt: string;
  isDeleted: boolean; // Always returned by API with default false
  memberCount: number; // Always calculated by API
  tournamentCount: number; // Always calculated by API
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

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Klubok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-red mb-2">Klub Kezelés</h1>
          <p className="text-base-content/60">Klubok áttekintése és kezelése</p>
        </div>
        <button 
          onClick={fetchClubs}
          className="admin-btn-primary text-sm flex items-center gap-2"
          disabled={loading}
        >
          <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconBuilding className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Klub</h3>
          <p className="text-3xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconBuilding className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Aktív Klubok</h3>
          <p className="text-3xl font-bold text-primary">{stats.active}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconBuilding className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Törölt Klubok</h3>
          <p className="text-3xl font-bold text-primary">{stats.deleted}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconUsers className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Tag</h3>
          <p className="text-3xl font-bold text-primary">{stats.totalMembers}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconTrophy className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Verseny</h3>
          <p className="text-3xl font-bold text-primary">{stats.totalTournaments}</p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-glass-card">
        <div className="form-control">
          <div className="input-group flex gap-2">
            <span className="p-3 rounded-l-xl bg-primary/10 border border-r-0 border-primary/30 flex items-center">
              <IconSearch className="w-4 h-4 text-primary" />
            </span>
            <input
              type="text"
              placeholder="Keresés név, helyszín vagy leírás alapján..."
              className="admin-input rounded-l-none border-l-0 flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClubs.map(club => (
          <div key={club._id} className="admin-glass-card transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-base-content mb-2 group-hover:text-primary transition-colors">
                  {club.name}
                </h2>
                <div className="flex items-center gap-2 text-base-content/60 mb-3">
                  <IconMapPin className="w-4 h-4" />
                  <span className="text-sm">{club.location}</span>
                </div>
                <p className="text-sm text-base-content/70 mb-4 line-clamp-3 leading-relaxed">
                  {club.description || 'Nincs leírás'}
                </p>
              </div>
                             {club.isDeleted && (
                 <span className="admin-badge-danger">Törölve</span>
               )}
            </div>

            <div className="flex items-center gap-4 text-sm text-base-content/60 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-accent/10">
                  <IconUsers className="w-4 h-4 text-accent" />
                </div>
                <span className="font-medium">{club.memberCount} tag</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-accent/10">
                  <IconTrophy className="w-4 h-4 text-accent" />
                </div>
                <span className="font-medium">{club.tournamentCount} verseny</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="admin-badge-info">
                {club.subscriptionModel || 'free'}
              </span>
              <Link
                href={`/clubs/${club._id}`}
                className="admin-btn-primary text-sm px-4 py-2 gap-2 inline-flex items-center"
                target="_blank"
              >
                <IconExternalLink className="w-4 h-4" />
                Megnyitás
              </Link>
            </div>

            <div className="flex items-center gap-2 text-xs text-base-content/40">
              <IconCalendar className="w-3 h-3" />
              <span>Létrehozva: {new Date(club.createdAt).toLocaleDateString('hu-HU')}</span>
            </div>
          </div>
        ))}
      </div>

              {filteredClubs.length === 0 && (
        <div className="admin-glass-card text-center py-12">
          <div className="text-base-content/20 text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold text-base-content mb-2">Nincsenek klubok</h3>
          <p className="text-base-content/60">
            {searchTerm 
              ? 'Nincsenek klubok a megadott feltételekkel.'
              : 'Még nincsenek regisztrált klubok.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
