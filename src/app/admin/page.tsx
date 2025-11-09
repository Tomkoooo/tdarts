"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  IconUsers, 
  IconBuilding, 
  IconTrophy, 
  IconAlertTriangle, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconRefresh, 
  IconSpeakerphone, 
  IconCheck, 
  IconBug,
  IconActivity,
  IconServer,
  IconArrowRight,
  IconChartBar
} from '@tabler/icons-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
  const [errorChartData, setErrorChartData] = useState<ChartData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const [statsResponse, userChartResponse, clubChartResponse, tournamentChartResponse, errorChartResponse] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/charts/users'),
        axios.get('/api/admin/charts/clubs'),
        axios.get('/api/admin/charts/tournaments'),
        axios.get('/api/admin/charts/errors')
      ]);

      setStats(statsResponse.data);
      
      const extractChartData = (response: any) => {
        if (response.data && response.data.success && response.data.data) {
          return response.data.data;
        }
        return response.data;
      };
      
      setUserChartData(extractChartData(userChartResponse));
      setClubChartData(extractChartData(clubChartResponse));
      setTournamentChartData(extractChartData(tournamentChartResponse));
      setErrorChartData(extractChartData(errorChartResponse));
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20   rounded-full"></div>
            <div className="w-20 h-20    rounded-full animate-spin absolute top-0"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-base-content">Dashboard betöltése</p>
            <p className="text-sm text-base-content/60">Adatok lekérdezése...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mx-auto">
            <IconAlertTriangle className="w-12 h-12 text-error" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-base-content">Hiba történt</h2>
            <p className="text-base-content/60">Nem sikerült betölteni a dashboard adatokat.</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="btn btn-primary gap-2"
          >
            <IconRefresh className="w-5 h-5" />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  const HeroStatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'primary',
    monthlyValue,
    monthlyLabel,
  }: { 
    title: string; 
    value: number; 
    change: number; 
    icon: any; 
    color?: string;
    monthlyValue?: number;
    monthlyLabel?: string;
    trend?: 'up' | 'down';
  }) => {
    const colorClasses = {
      primary: 'from-primary/20 to-primary/5',
      success: 'from-success/20 to-success/5',
      warning: 'from-warning/20 to-warning/5',
      error: 'from-error/20 to-error/5',
      info: 'from-info/20 to-info/5',
    };

    const iconColorClasses = {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      info: 'text-info'
    };

    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary} border backdrop-blur-xl p-6 hover:scale-[1.02] transition-all duration-300 group`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}></div>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-base-100/50 backdrop-blur-sm border  group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-7 h-7 ${iconColorClasses[color as keyof typeof iconColorClasses] || iconColorClasses.primary}`} />
            </div>
            <div className="flex items-center gap-2">
              {change >= 0 ? (
                <IconTrendingUp className="w-5 h-5 text-success" />
              ) : (
                <IconTrendingDown className="w-5 h-5 text-error" />
              )}
              <span className={`text-sm font-bold ${change >= 0 ? 'text-success' : 'text-error'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-sm font-medium text-base-content/70 mb-2">{title}</h3>
          
          {/* Value */}
          <p className="text-4xl font-bold text-base-content mb-4 tabular-nums">
            {value.toLocaleString()}
          </p>
          
          {/* Monthly Stats */}
          {monthlyValue !== undefined && (
            <div className="flex items-center justify-between pt-4"
              <span className="text-xs text-base-content/60">{monthlyLabel}</span>
              <span className={`text-sm font-bold ${iconColorClasses[color as keyof typeof iconColorClasses] || iconColorClasses.primary}`}>
                +{monthlyValue}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ModernChartCard = ({ 
    title, 
    data, 
    color = 'primary',
    type = 'area'
  }: { 
    title: string; 
    data: ChartData | null; 
    color?: string;
    type?: 'area' | 'bar';
  }) => {
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-base-100 border  rounded-lg p-3 shadow-xl backdrop-blur-sm">
            <p className="text-sm font-medium text-base-content mb-1">{label}</p>
            <p className="text-lg font-bold text-primary">{payload[0].value}</p>
          </div>
        );
      }
      return null;
    };

    const chartData = data && data.datasets && data.datasets[0] && data.datasets[0].data 
      ? data.labels.map((label, index) => ({
          month: label,
          count: data.datasets[0].data[index] || 0
        }))
      : [];

    const getChartColors = () => {
      switch (color) {
        case 'error':
          return { stroke: '#ef4444', gradient: 'rgba(239, 68, 68, 0.3)', fill: 'rgba(239, 68, 68, 0.1)' };
        case 'warning':
          return { stroke: '#f59e0b', gradient: 'rgba(245, 158, 11, 0.3)', fill: 'rgba(245, 158, 11, 0.1)' };
        case 'success':
          return { stroke: '#10b981', gradient: 'rgba(16, 185, 129, 0.3)', fill: 'rgba(16, 185, 129, 0.1)' };
        case 'info':
          return { stroke: '#3b82f6', gradient: 'rgba(59, 130, 246, 0.3)', fill: 'rgba(59, 130, 246, 0.1)' };
        default:
          return { stroke: '#ef4444', gradient: 'rgba(239, 68, 68, 0.3)', fill: 'rgba(239, 68, 68, 0.1)' };
      }
    };

    const chartColors = getChartColors();

    return (
      <div className="bg-base-100/50 backdrop-blur-xl border  rounded-2xl p-6 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
            <IconChartBar className="w-5 h-5 text-primary" />
            {title}
          </h3>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.gradient} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartColors.fill} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(156, 163, 175, 0.1)" 
                    vertical={false}
                  />
                  
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
                  />
                  
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={chartColors.stroke}
                    strokeWidth={3}
                    fill={`url(#gradient-${title})`}
                    dot={{ fill: chartColors.stroke, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: chartColors.stroke, strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(156, 163, 175, 0.1)" 
                    vertical={false}
                  />
                  
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
                  />
                  
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Bar
                    dataKey="count"
                    fill={chartColors.stroke}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto">
                <IconChartBar className="w-8 h-8 text-base-content/30" />
              </div>
              <p className="text-base-content/60 text-sm">Nincs megjeleníthető adat</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    href,
    color = 'primary'
  }: {
    title: string;
    description: string;
    icon: any;
    href: string;
    color?: string;
  }) => {
    const colorClasses = {
      primary: 'from-primary/20 to-primary/5  hover:
      success: 'from-success/20 to-success/5  hover:
      warning: 'from-warning/20 to-warning/5  hover:
      error: 'from-error/20 to-error/5  hover:
      info: 'from-info/20 to-info/5  hover:
    };

    return (
      <Link href={href} className="group">
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary} border backdrop-blur-xl p-5 hover:scale-[1.02] transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-base-100/50 backdrop-blur-sm border  group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base-content mb-1 truncate">{title}</h4>
              <p className="text-sm text-base-content/60 truncate">{description}</p>
            </div>
            <IconArrowRight className="w-5 h-5 text-base-content/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border  p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
              <IconActivity className="w-10 h-10 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-base-content/70 text-lg">Rendszer áttekintés és statisztikák</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-sm text-base-content/60">
              <div className="flex items-center gap-2 mb-1">
                <IconRefresh className="w-4 h-4" />
                <span className="font-medium">Utolsó frissítés:</span>
              </div>
              <div className="font-mono text-base-content">
                {lastUpdate.toLocaleString('hu-HU')}
              </div>
            </div>
            <button 
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="btn btn-primary gap-2 min-w-[140px]"
            >
              <IconRefresh className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Frissítés...' : 'Frissítés'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <HeroStatCard
          title="Felhasználók"
          value={stats.totalUsers}
          change={stats.userGrowth}
          icon={IconUsers}
          color="primary"
          monthlyValue={stats.newUsersThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Klubok"
          value={stats.totalClubs}
          change={stats.clubGrowth}
          icon={IconBuilding}
          color="info"
          monthlyValue={stats.newClubsThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Versenyek"
          value={stats.totalTournaments}
          change={stats.tournamentGrowth}
          icon={IconTrophy}
          color="success"
          monthlyValue={stats.newTournamentsThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Hibák"
          value={stats.totalErrors}
          change={stats.errorGrowth}
          icon={IconAlertTriangle}
          color="error"
          monthlyValue={stats.errorsThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Visszajelzések"
          value={stats.totalFeedback}
          change={stats.feedbackGrowth}
          icon={IconBug}
          color="warning"
          monthlyValue={stats.feedbackThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernChartCard
          title="Felhasználó Regisztrációk"
          data={userChartData}
          color="primary"
          type="area"
        />
        <ModernChartCard
          title="Klub Létrehozások"
          data={clubChartData}
          color="info"
          type="area"
        />
        <ModernChartCard
          title="Verseny Indítások"
          data={tournamentChartData}
          color="success"
          type="bar"
        />
        <ModernChartCard
          title="Hibák Időbeli Alakulása"
          data={errorChartData}
          color="error"
          type="area"
        />
      </div>

      {/* Quick Actions Section */}
      <div className="bg-base-100/50 backdrop-blur-xl border  rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-base-content mb-6 flex items-center gap-3">
          <IconActivity className="w-7 h-7 text-primary" />
          Gyors Műveletek
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <QuickActionCard
            title="Announcement Kezelő"
            description="Rendszerüzenetek kezelése"
            icon={IconSpeakerphone}
            href="/admin/announcements"
            color="primary"
          />
          <QuickActionCard
            title="Todo Kezelő"
            description="Feladatok és észrevételek"
            icon={IconCheck}
            href="/admin/todos"
            color="info"
          />
          <QuickActionCard
            title="Hibabejelentések"
            description="Felhasználói visszajelzések"
            icon={IconBug}
            href="/admin/feedback"
            color="warning"
          />
          <QuickActionCard
            title="Felhasználók"
            description="Felhasználók kezelése"
            icon={IconUsers}
            href="/admin/users"
            color="success"
          />
          <QuickActionCard
            title="Klubok"
            description="Klubok áttekintése"
            icon={IconBuilding}
            href="/admin/clubs"
            color="info"
          />
          <QuickActionCard
            title="Versenyek"
            description="Versenyek kezelése"
            icon={IconTrophy}
            href="/admin/tournaments"
            color="success"
          />
          <QuickActionCard
            title="Hibák"
            description="Rendszerhibák áttekintése"
            icon={IconAlertTriangle}
            href="/admin/errors"
            color="error"
          />
          <QuickActionCard
            title="Beállítások"
            description="Rendszer konfiguráció"
            icon={IconServer}
            href="/admin/settings"
            color="primary"
          />
        </div>
      </div>
    </div>
  );
}
