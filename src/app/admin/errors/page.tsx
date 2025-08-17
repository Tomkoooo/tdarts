"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconAlertTriangle, IconRefresh, IconClock, IconUser, IconBuilding, IconTrophy } from '@tabler/icons-react';
import toast from 'react-hot-toast';

interface ErrorLog {
  _id: string;
  level: string;
  category: string;
  message: string;
  error?: string;
  stack?: string;
  userId?: string;
  userRole?: string;
  clubId?: string;
  tournamentId?: string;
  endpoint?: string;
  method?: string;
  timestamp: string;
  metadata?: any;
}

interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByLevel: Record<string, number>;
  recentErrors: ErrorLog[];
}

interface DailyErrors {
  date: string;
  count: number;
  categories: Record<string, number>;
}

export default function AdminErrorsPage() {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [dailyErrors, setDailyErrors] = useState<DailyErrors[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [dateRange, setDateRange] = useState<number>(7); // days

  const fetchErrorData = async () => {
    try {
      setLoading(true);
      const [statsResponse, dailyResponse] = await Promise.all([
        axios.get('/api/admin/errors/stats'),
        axios.get(`/api/admin/errors/daily?days=${dateRange}`)
      ]);

      setErrorStats(statsResponse.data);
      setDailyErrors(dailyResponse.data);
    } catch (error) {
      console.error('Error fetching error data:', error);
      toast.error('Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, [dateRange]);
 


  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      auth: IconUser,
      club: IconBuilding,
      tournament: IconTrophy,
      player: IconUser,
      user: IconUser,
      api: IconAlertTriangle,
      system: IconAlertTriangle,
      database: IconAlertTriangle
    };
    return icons[category] || IconAlertTriangle;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Hiba adatok betöltése...</p>
        </div>
      </div>
    );
  }

  if (!errorStats) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-base-content mb-2">Hiba történt</h2>
          <p className="text-base-content/60 mb-4">Nem sikerült betölteni a hiba adatokat.</p>
          <button 
            onClick={fetchErrorData}
            className="admin-btn-primary"
          >
            <IconRefresh className="w-4 h-4" />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  const filteredRecentErrors = errorStats.recentErrors.filter(error => {
    const matchesCategory = selectedCategory === 'all' || error.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || error.level === selectedLevel;
    return matchesCategory && matchesLevel;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-red mb-2">Hiba Kezelés</h1>
          <p className="text-base-content/60">Rendszer hibák monitorozása és kezelése</p>
        </div>
        <button 
          onClick={fetchErrorData}
          className="admin-btn-primary text-sm flex items-center gap-2"
          disabled={loading}
        >
          <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconAlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Hiba</h3>
          <p className="text-3xl font-bold text-primary">{errorStats.totalErrors}</p>
        </div>
        {Object.entries(errorStats.errorsByLevel).slice(0, 3).map(([level, count]) => (
          <div key={level} className="admin-glass-card text-center">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
              <IconAlertTriangle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-base-content/60 mb-1 capitalize">{level}</h3>
            <p className="text-3xl font-bold text-primary">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="admin-glass-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control flex-col flex gap-1">
            <label className="label">
              <span className="label-text font-medium">Időszak</span>
            </label>
            <select 
              className="select select-bordered bg-base-200/50 border-base-300"
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
            >
              <option value={1}>Utolsó 24 óra</option>
              <option value={7}>Utolsó 7 nap</option>
              <option value={30}>Utolsó 30 nap</option>
              <option value={90}>Utolsó 3 hónap</option>
            </select>
          </div>
          <div className="form-control flex-col flex gap-1">
            <label className="label">
              <span className="label-text font-medium">Kategória</span>
            </label>
            <select 
              className="select select-bordered bg-base-200/50 border-base-300"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Összes kategória</option>
              {Object.keys(errorStats.errorsByCategory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="form-control flex-col flex gap-1">
            <label className="label">
              <span className="label-text font-medium">Szint</span>
            </label>
            <select 
              className="select select-bordered bg-base-200/50 border-base-300"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="all">Összes szint</option>
              {Object.keys(errorStats.errorsByLevel).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="admin-glass-card">
        <h3 className="text-lg font-semibold text-base-content mb-4">Napi Hibák</h3>
        {dailyErrors.length > 0 ? (
          <div className="h-64">
            <div className="w-full h-full flex items-end justify-between gap-1">
              {dailyErrors.map((day) => {
                const maxCount = Math.max(...dailyErrors.map(d => d.count), 1);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center">
                      <div 
                        className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80"
                        style={{ 
                          height: `${(day.count / maxCount) * 200}px`,
                          minHeight: '4px',
                          backgroundColor: 'rgb(59, 130, 246)',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                        }}
                      ></div>
                      <span className="text-xs mt-2 text-base-content/60 font-medium">
                        {new Date(day.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-base-content/40">{day.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-base-content/20 text-6xl mb-4">📊</div>
              <p className="text-base-content/60">Nincs hiba adat a kiválasztott időszakra</p>
            </div>
          </div>
        )}
      </div>

      {/* Category and Level Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-glass-card">
          <h3 className="text-lg font-semibold text-base-content mb-4">Hibák Kategóriánként</h3>
          <div className="space-y-3">
            {Object.entries(errorStats.errorsByCategory)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => {
                const Icon = getCategoryIcon(category);
                return (
                  <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
                    <div className="flex items-center gap-3">
                                         <div className="p-2 rounded-lg bg-primary/10">
                     <Icon className="w-4 h-4 text-primary" />
                   </div>
                   <span className="capitalize font-medium text-primary">{category}</span>
                    </div>
                    <span className="font-bold text-base-content">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="admin-glass-card">
          <h3 className="text-lg font-semibold text-base-content mb-4">Hibák Szintenként</h3>
          <div className="space-y-3">
            {Object.entries(errorStats.errorsByLevel)
              .sort(([,a], [,b]) => b - a)
              .map(([level, count]) => (
                <div key={level} className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
                  <div className="flex items-center gap-3">
                                       <div className="p-2 rounded-lg bg-primary/10">
                     <IconAlertTriangle className="w-4 h-4 text-primary" />
                   </div>
                   <span className="capitalize font-medium text-primary">{level}</span>
                  </div>
                  <span className="font-bold text-base-content">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="admin-glass-card">
        <h3 className="text-lg font-semibold text-base-content mb-4">Legutóbbi Hibák</h3>
        <div className="space-y-4">
          {filteredRecentErrors.length > 0 ? (
            filteredRecentErrors.map(error => (
                             <div key={error._id} className="border-l-4 border-primary pl-4 py-3 bg-base-200/20 rounded-r-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                                         <div className="flex items-center gap-2 mb-2 flex-wrap">
                       <span className="badge badge-sm badge-primary">
                         {error.level}
                       </span>
                       <span className="badge badge-outline badge-sm">
                         {error.category}
                       </span>
                      {error.endpoint && (
                        <span className="text-xs text-base-content/60 bg-base-200 px-2 py-1 rounded">
                          {error.method} {error.endpoint}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-base-content mb-1">{error.message}</p>
                    {error.error && (
                      <p className="text-sm text-base-content/60 mb-2">{error.error}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-base-content/40 flex-wrap">
                      <div className="flex items-center gap-1">
                        <IconClock className="w-3 h-3" />
                        <span>{new Date(error.timestamp).toLocaleString('hu-HU')}</span>
                      </div>
                      {error.userId && (
                        <div className="flex items-center gap-1">
                          <IconUser className="w-3 h-3" />
                          <span>User: {error.userId}</span>
                        </div>
                      )}
                      {error.clubId && (
                        <div className="flex items-center gap-1">
                          <IconBuilding className="w-3 h-3" />
                          <span>Club: {error.clubId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-base-content/20 text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-base-content mb-2">Nincsenek hibák</h3>
              <p className="text-base-content/60">
                {selectedCategory !== 'all' || selectedLevel !== 'all'
                  ? 'Nincsenek hibák a megadott feltételekkel.'
                  : 'Nincsenek hibák a rendszerben.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
