"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  IconAlertTriangle, 
  IconRefresh, 
  IconClock, 
  IconUser, 
  IconBuilding, 
  IconTrophy,
  IconAlertCircle,
  IconBug,
  IconDatabase,
  IconServer,
  IconApi,
  IconCode,
  
  IconChevronDown,
  IconChevronUp,
  IconFilter
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import DailyChart from '@/components/admin/DailyChart';

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

export default function AdminErrorsPage() {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [dateRange, setDateRange] = useState<number>(7);
  const [showAuthErrors, setShowAuthErrors] = useState<boolean>(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const fetchErrorData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        days: dateRange.toString(),
        category: selectedCategory,
        level: selectedLevel,
        showAuthErrors: showAuthErrors.toString()
      });

      const [statsResponse] = await Promise.all([
        axios.get(`/api/admin/errors/stats?${params}`),
      ]);

      setErrorStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching error data:', error);
      toast.error('Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, [dateRange, selectedCategory, selectedLevel, showAuthErrors]);

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      auth: { icon: IconUser, color: 'bg-warning/10 text-warning border-warning/30', label: 'Auth' },
      club: { icon: IconBuilding, color: 'bg-info/10 text-info border-info/30', label: 'Club' },
      tournament: { icon: IconTrophy, color: 'bg-success/10 text-success border-success/30', label: 'Tournament' },
      player: { icon: IconUser, color: 'bg-primary/10 text-primary border-primary/30', label: 'Player' },
      user: { icon: IconUser, color: 'bg-primary/10 text-primary border-primary/30', label: 'User' },
      api: { icon: IconApi, color: 'bg-error/10 text-error border-error/30', label: 'API' },
      system: { icon: IconServer, color: 'bg-error/10 text-error border-error/30', label: 'System' },
      database: { icon: IconDatabase, color: 'bg-error/10 text-error border-error/30', label: 'Database' }
    };
    return configs[category] || { icon: IconBug, color: 'bg-base-300/10 text-base-content border-base-300/30', label: category };
  };

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'error':
        return { color: 'bg-error text-error-content', icon: IconAlertCircle };
      case 'warn':
        return { color: 'bg-warning text-warning-content', icon: IconAlertTriangle };
      case 'info':
        return { color: 'bg-info text-info-content', icon: IconAlertCircle };
      default:
        return { color: 'bg-base-300 text-base-content', icon: IconAlertCircle };
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
          <p className="text-base-content/60">Hiba adatok betöltése...</p>
        </div>
      </div>
    );
  }

  if (!errorStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mx-auto">
            <IconAlertTriangle className="w-12 h-12 text-error" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-base-content">Hiba történt</h2>
            <p className="text-base-content/60">Nem sikerült betölteni a hiba adatokat.</p>
          </div>
          <button 
            onClick={fetchErrorData}
            className="btn btn-primary gap-2"
          >
            <IconRefresh className="w-5 h-5" />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  const filteredRecentErrors = errorStats.recentErrors;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-error/20 via-error/10 to-transparent border border-error/30 p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
              <IconAlertTriangle className="w-10 h-10 text-error" />
              Hiba Kezelés
            </h1>
            <p className="text-base-content/70 text-lg">Rendszer hibák monitorozása és kezelése</p>
          </div>
          
          <button 
            onClick={fetchErrorData}
            disabled={loading}
            className="btn btn-error gap-2"
          >
            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-error/20 to-error/5 border border-error/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle className="w-7 h-7 text-error" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Összes Hiba</h3>
          <p className="text-4xl font-bold text-error">{errorStats.totalErrors}</p>
        </div>
        {Object.entries(errorStats.errorsByLevel).slice(0, 3).map(([level, count]) => {
          const config = getLevelConfig(level);
          return (
            <div key={level} className="bg-base-100 border border-base-300 rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <config.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-base-content/70 mb-2 capitalize">{level}</h3>
              <p className="text-4xl font-bold text-primary">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Daily Chart */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <DailyChart
          title="Hibák napi előfordulása"
          apiEndpoint={`/api/admin/errors/daily?days=${dateRange}&showAuthErrors=${showAuthErrors}`}
          color="error"
          icon=""
        />
      </div>

      {/* Filters */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconFilter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Szűrők</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Időszak</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
            >
              <option value={1}>Utolsó 24 óra</option>
              <option value={7}>Utolsó 7 nap</option>
              <option value={30}>Utolsó 30 nap</option>
              <option value={90}>Utolsó 3 hónap</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Kategória</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Összes kategória</option>
              {Object.keys(errorStats.errorsByCategory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Szint</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="all">Összes szint</option>
              {Object.keys(errorStats.errorsByLevel).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Auth hibák</span>
            </label>
            <label className="cursor-pointer label justify-start gap-3">
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={showAuthErrors}
                onChange={(e) => setShowAuthErrors(e.target.checked)}
              />
              <span className="label-text">
                {showAuthErrors ? 'Megjelenítés' : 'Elrejtés'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Category and Level Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
            <IconCode className="w-6 h-6 text-primary" />
            Hibák Kategóriánként
          </h3>
          <div className="space-y-3">
            {Object.entries(errorStats.errorsByCategory)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => {
                const config = getCategoryConfig(category);
                return (
                  <div key={category} className={`flex items-center justify-between p-4 rounded-xl ${config.color} border hover:scale-[1.02] transition-transform duration-200`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-base-100/50">
                        <config.icon className="w-5 h-5" />
                      </div>
                      <span className="capitalize font-bold">{config.label}</span>
                    </div>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
            <IconAlertTriangle className="w-6 h-6 text-primary" />
            Hibák Szintenként
          </h3>
          <div className="space-y-3">
            {Object.entries(errorStats.errorsByLevel)
              .sort(([,a], [,b]) => b - a)
              .map(([level, count]) => {
                const config = getLevelConfig(level);
                return (
                  <div key={level} className="flex items-center justify-between p-4 rounded-xl bg-base-200 hover:bg-base-300 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <config.icon className="w-5 h-5" />
                      </div>
                      <span className="capitalize font-bold">{level}</span>
                    </div>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
          <IconBug className="w-6 h-6 text-primary" />
          Legutóbbi Hibák ({filteredRecentErrors.length})
        </h3>
        <div className="space-y-4">
          {filteredRecentErrors.length > 0 ? (
            filteredRecentErrors.map(error => {
              const categoryConfig = getCategoryConfig(error.category);
              const levelConfig = getLevelConfig(error.level);
              const isExpanded = expandedError === error._id;

              return (
                <div key={error._id} className="border border-base-300 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="p-5 bg-base-200/50">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${categoryConfig.color} border flex-shrink-0`}>
                          <categoryConfig.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`${levelConfig.color} px-3 py-1 rounded-lg text-xs font-bold uppercase`}>
                              {error.level}
                            </span>
                            <span className="badge badge-outline">
                              {error.category}
                            </span>
                            {error.method && error.endpoint && (
                              <span className="text-xs text-base-content/60 bg-base-300 px-2 py-1 rounded font-mono">
                                {error.method} {error.endpoint}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-base-content break-words">{error.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedError(isExpanded ? null : error._id)}
                        className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                      >
                        {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-base-content/60">
                      <div className="flex items-center gap-1">
                        <IconClock className="w-4 h-4" />
                        <span>{new Date(error.timestamp).toLocaleString('hu-HU')}</span>
                      </div>
                      {error.userId && (
                        <div className="flex items-center gap-1">
                          <IconUser className="w-4 h-4" />
                          <span>User: {error.userId.slice(0, 8)}...</span>
                        </div>
                      )}
                      {error.clubId && (
                        <div className="flex items-center gap-1">
                          <IconBuilding className="w-4 h-4" />
                          <span>Club: {error.clubId.slice(0, 8)}...</span>
                        </div>
                      )}
                      {error.tournamentId && (
                        <div className="flex items-center gap-1">
                          <IconTrophy className="w-4 h-4" />
                          <span>Tournament: {error.tournamentId.slice(0, 8)}...</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-base-300 space-y-3">
                        {error.error && (
                          <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                            <p className="text-sm font-bold text-error mb-1">Error Details:</p>
                            <p className="text-sm text-base-content/80 font-mono break-all">{error.error}</p>
                          </div>
                        )}
                        {error.stack && (
                          <div className="bg-base-300/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                            <p className="text-sm font-bold text-base-content mb-2">Stack Trace:</p>
                            <pre className="text-xs text-base-content/70 font-mono whitespace-pre-wrap break-all">
                              {error.stack}
                            </pre>
                          </div>
                        )}
                        {error.metadata && Object.keys(error.metadata).length > 0 && (
                          <div className="bg-info/10 border border-info/30 rounded-lg p-3">
                            <p className="text-sm font-bold text-info mb-2">Metadata:</p>
                            <pre className="text-xs text-base-content/70 font-mono whitespace-pre-wrap break-all">
                              {JSON.stringify(error.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconAlertCircle className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-base-content mb-2">Nincsenek hibák</h3>
              <p className="text-base-content/60">
                {selectedCategory !== 'all' || selectedLevel !== 'all'
                  ? 'Nincsenek hibák a megadott feltételekkel.'
                  : 'Nincsenek hibák a rendszerben.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
