"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Users,
  Building,
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Speakerphone,
  Check,
  Bug,
  Activity,
  Server,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Spinner size="xl" className="mb-4" />
            <h2 className="text-lg font-semibold mb-2">Dashboard betöltése</h2>
            <p className="text-sm text-muted-foreground">Adatok lekérdezése...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-destructive/50">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Hiba történt</h2>
            <p className="text-sm text-muted-foreground mb-6">Nem sikerült betölteni a dashboard adatokat.</p>
            <Button onClick={fetchDashboardData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Újrapróbálás
            </Button>
          </CardContent>
        </Card>
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
    const getColorClasses = () => {
      switch (color) {
        case 'success':
          return 'border-success/30 bg-success/5';
        case 'warning':
          return 'border-warning/30 bg-warning/5';
        case 'error':
          return 'border-destructive/30 bg-destructive/5';
        case 'info':
          return 'border-info/30 bg-info/5';
        default:
          return 'border-primary/30 bg-primary/5';
      }
    };

    const getIconColor = () => {
      switch (color) {
        case 'success':
          return 'text-success';
        case 'warning':
          return 'text-warning';
        case 'error':
          return 'text-destructive';
        case 'info':
          return 'text-info';
        default:
          return 'text-primary';
      }
    };

    return (
      <Card className={`${getColorClasses()} hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}></div>
        </div>

        <CardContent className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/10 group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-7 h-7 ${getIconColor()}`} />
            </div>
            <div className="flex items-center gap-2">
              {change >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              <span className={`text-sm font-bold ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>

          {/* Value */}
          <p className="text-4xl font-bold text-foreground mb-4 tabular-nums">
            {value.toLocaleString()}
          </p>

          {/* Monthly Stats */}
          {monthlyValue !== undefined && (
            <div className="flex items-center justify-between pt-4 border-t border-border/10">
              <span className="text-xs text-muted-foreground">{monthlyLabel}</span>
              <span className={`text-sm font-bold ${getIconColor()}`}>
                +{monthlyValue}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
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
          <Card className="p-3">
            <p className="text-sm font-medium mb-1">{label}</p>
            <p className="text-lg font-bold text-primary">{payload[0].value}</p>
          </Card>
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
          return { stroke: 'hsl(var(--destructive))', gradient: 'hsl(var(--destructive) / 0.3)', fill: 'hsl(var(--destructive) / 0.1)' };
        case 'warning':
          return { stroke: 'hsl(var(--warning))', gradient: 'hsl(var(--warning) / 0.3)', fill: 'hsl(var(--warning) / 0.1)' };
        case 'success':
          return { stroke: 'hsl(var(--success))', gradient: 'hsl(var(--success) / 0.3)', fill: 'hsl(var(--success) / 0.1)' };
        case 'info':
          return { stroke: 'hsl(var(--info))', gradient: 'hsl(var(--info) / 0.3)', fill: 'hsl(var(--info) / 0.1)' };
        default:
          return { stroke: 'hsl(var(--primary))', gradient: 'hsl(var(--primary) / 0.3)', fill: 'hsl(var(--primary) / 0.1)' };
      }
    };

    const chartColors = getChartColors();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <BarChart3 className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
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
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
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
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Nincs megjeleníthető adat</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
    const getCardClasses = () => {
      switch (color) {
        case 'success':
          return 'border-success/30 bg-success/5 hover:border-success/50';
        case 'warning':
          return 'border-warning/30 bg-warning/5 hover:border-warning/50';
        case 'error':
          return 'border-destructive/30 bg-destructive/5 hover:border-destructive/50';
        case 'info':
          return 'border-info/30 bg-info/5 hover:border-info/50';
        default:
          return 'border-primary/30 bg-primary/5 hover:border-primary/50';
      }
    };

    return (
      <Link href={href} className="group">
        <Card className={`${getCardClasses()} hover:scale-[1.02] transition-all duration-300 p-5`}>
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/10 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate">{title}</h4>
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>

        <CardContent className="relative z-10 p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold flex items-center gap-3">
                <Activity className="w-10 h-10 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">Rendszer áttekintés és statisztikák</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4" />
                  <span className="font-medium">Utolsó frissítés:</span>
                </div>
                <div className="font-mono">
                  {lastUpdate.toLocaleString('hu-HU')}
                </div>
              </div>
              <Button
                onClick={fetchDashboardData}
                disabled={isRefreshing}
                className="gap-2 min-w-[140px]"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Frissítés...' : 'Frissítés'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-primary">
            <Activity className="w-7 h-7" />
            Gyors Műveletek
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <QuickActionCard
            title="Announcement Kezelő"
            description="Rendszerüzenetek kezelése"
            icon={Speakerphone}
            href="/admin/announcements"
            color="primary"
          />
          <QuickActionCard
            title="Todo Kezelő"
            description="Feladatok és észrevételek"
            icon={Check}
            href="/admin/todos"
            color="info"
          />
          <QuickActionCard
            title="Hibabejelentések"
            description="Felhasználói visszajelzések"
            icon={Bug}
            href="/admin/feedback"
            color="warning"
          />
          <QuickActionCard
            title="Felhasználók"
            description="Felhasználók kezelése"
            icon={Users}
            href="/admin/users"
            color="success"
          />
          <QuickActionCard
            title="Klubok"
            description="Klubok áttekintése"
            icon={Building}
            href="/admin/clubs"
            color="info"
          />
          <QuickActionCard
            title="Versenyek"
            description="Versenyek kezelése"
            icon={Trophy}
            href="/admin/tournaments"
            color="success"
          />
          <QuickActionCard
            title="Hibák"
            description="Rendszerhibák áttekintése"
            icon={AlertTriangle}
            href="/admin/errors"
            color="error"
          />
          <QuickActionCard
            title="Beállítások"
            description="Rendszer konfiguráció"
            icon={Server}
            href="/admin/settings"
            color="primary"
          />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
