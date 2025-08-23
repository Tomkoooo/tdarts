"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconUsers, IconBuilding, IconTrophy, IconAlertTriangle, IconTrendingUp, IconTrendingDown, IconRefresh, IconSpeakerphone, IconCheck, IconBug } from '@tabler/icons-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  totalClubs: number;
  totalTournaments: number;
  totalErrors: number;
  totalFeedback: number;
  newUsersThisMonth: number;
  newClubsThisMonth: number;
  newTournamentsThisMonth: number;
  errorsThisMonth: number;
  feedbackThisMonth: number;
  userGrowth: number;
  clubGrowth: number;
  tournamentGrowth: number;
  errorGrowth: number;
  feedbackGrowth: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userChartData, setUserChartData] = useState<ChartData | null>(null);
  const [clubChartData, setClubChartData] = useState<ChartData | null>(null);
  const [tournamentChartData, setTournamentChartData] = useState<ChartData | null>(null);
  const [feedbackChartData, setFeedbackChartData] = useState<ChartData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, userChartResponse, clubChartResponse, tournamentChartResponse, feedbackChartResponse] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/charts/users'),
        axios.get('/api/admin/charts/clubs'),
        axios.get('/api/admin/charts/tournaments'),
        axios.get('/api/admin/charts/feedback')
      ]);

      setStats(statsResponse.data);
      setUserChartData(userChartResponse.data);
      setClubChartData(clubChartResponse.data);
      setTournamentChartData(tournamentChartResponse.data);
      setFeedbackChartData(feedbackChartResponse.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Adatok betöltése...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-base-content mb-2">Hiba történt</h2>
          <p className="text-base-content/60 mb-4">Nem sikerült betölteni az adatokat.</p>
          <button 
            onClick={fetchDashboardData}
            className="admin-btn-primary"
          >
            <IconRefresh className="w-4 h-4" />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'primary',
    monthlyValue,
    monthlyLabel
  }: { 
    title: string; 
    value: number; 
    change: number; 
    icon: any; 
    color?: string;
    monthlyValue?: number;
    monthlyLabel?: string;
  }) => (
    console.log(color),
    <div className="admin-glass-card transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            {change >= 0 ? (
              <IconTrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <IconTrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{change}%
            </span>
          </div>
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-base-content/60 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-base-content mb-2">{value.toLocaleString()}</p>
      
      {monthlyValue !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/60">{monthlyLabel}</span>
          <span className="text-sm font-semibold text-primary">{monthlyValue}</span>
        </div>
      )}
    </div>
  );

  const ChartCard = ({ 
    title, 
    data, 
    color = 'primary' 
  }: { 
    title: string; 
    data: ChartData | null; 
    color?: string;
  }) => {
    const maxValue = data ? Math.max(...data.datasets[0].data, 1) : 1;
    const chartColor = 'rgb(59, 130, 246)'; // Mindig primary szín
    console.log(color);

    return (
      <div className="admin-glass-card transition-all duration-300">
        <h3 className="text-lg font-semibold text-base-content mb-4">{title}</h3>
        {data && data.datasets[0].data.length > 0 ? (
          <div className="h-64">
            <div className="w-full h-full flex items-end justify-between gap-1">
              {data.datasets[0].data.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <div 
                      className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80"
                      style={{ 
                        height: `${(value / maxValue) * 200}px`,
                        minHeight: '4px',
                        backgroundColor: chartColor,
                        boxShadow: `0 4px 12px ${chartColor}40`
                      }}
                    ></div>
                    <span className="text-xs mt-2 text-base-content/60 font-medium">
                      {data.labels[index]}
                    </span>
                    <span className="text-xs text-base-content/40 mt-1">
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-base-content/20 text-6xl mb-4">📊</div>
              <p className="text-base-content/60">Nincs adat</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-red mb-2">Admin Dashboard</h1>
          <p className="text-base-content/60">Rendszer áttekintés és statisztikák</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-base-content/60 text-right">
            <div>Utolsó frissítés:</div>
            <div className="font-medium">{lastUpdate.toLocaleString('hu-HU')}</div>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="admin-btn-primary text-sm"
            disabled={loading}
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Összes Felhasználó"
          value={stats.totalUsers}
          change={stats.userGrowth}
          icon={IconUsers}
          color="primary"
          monthlyValue={stats.newUsersThisMonth}
          monthlyLabel="Ebben a hónapban"
        />
        <StatCard
          title="Összes Klub"
          value={stats.totalClubs}
          change={stats.clubGrowth}
          icon={IconBuilding}
          color="primary"
          monthlyValue={stats.newClubsThisMonth}
          monthlyLabel="Ebben a hónapban"
        />
        <StatCard
          title="Összes Verseny"
          value={stats.totalTournaments}
          change={stats.tournamentGrowth}
          icon={IconTrophy}
          color="primary"
          monthlyValue={stats.newTournamentsThisMonth}
          monthlyLabel="Ebben a hónapban"
        />
        <StatCard
          title="Összes Hiba"
          value={stats.totalErrors}
          change={stats.errorGrowth}
          icon={IconAlertTriangle}
          color="primary"
          monthlyValue={stats.errorsThisMonth}
          monthlyLabel="Ebben a hónapban"
        />
        <StatCard
          title="Összes Visszajelzés"
          value={stats.totalFeedback}
          change={stats.feedbackGrowth}
          icon={IconBug}
          color="primary"
          monthlyValue={stats.feedbackThisMonth}
          monthlyLabel="Ebben a hónapban"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <ChartCard
          title="Felhasználó Regisztrációk"
          data={userChartData}
          color="primary"
        />
        <ChartCard
          title="Klub Létrehozások"
          data={clubChartData}
          color="primary"
        />
        <ChartCard
          title="Verseny Indítások"
          data={tournamentChartData}
          color="primary"
        />
        <ChartCard
          title="Visszajelzések"
          data={feedbackChartData}
          color="primary"
        />
      </div>

      {/* Quick Actions */}
      <div className="admin-glass-card">
        <h3 className="text-lg font-semibold mb-4">Gyors Műveletek</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/announcements" className="admin-glass-card hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                <IconSpeakerphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Announcement Kezelő</h4>
                <p className="text-sm text-base-content/60">Rendszerüzenetek</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/todos" className="admin-glass-card hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                <IconCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Todo Kezelő</h4>
                <p className="text-sm text-base-content/60">Feladatok és eszrevételek</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/feedback" className="admin-glass-card hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                <IconBug className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Hibabejelentések</h4>
                <p className="text-sm text-base-content/60">Felhasználói visszajelzések</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
