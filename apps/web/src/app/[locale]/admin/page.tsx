'use client';

import {
  AdminPageHeader,
  KpiCard,
  StatsGrid,
  TrendChart,
  BarChart,
  DoughnutChart,
  RecentActivity,
  type ActivityItem,
} from '@/features/admin/components';
import {
  IconUsers,
  IconBuildingStore,
  IconTrophy,
  IconTargetArrow,
} from '@tabler/icons-react';

// Mock data for demonstration - will be replaced with real data from services
const mockKpis = {
  totalUsers: 12450,
  userGrowth: 5.2,
  activeClubs: 847,
  clubGrowth: 2.1,
  tournamentsThisMonth: 156,
  tournamentGrowth: 12.4,
  matchesPlayed: 28934,
  matchGrowth: 8.7,
};

const mockRegistrationTrend = [
  { label: 'Jan', value: 420 },
  { label: 'Feb', value: 380 },
  { label: 'Mar', value: 510 },
  { label: 'Apr', value: 590 },
  { label: 'May', value: 620 },
  { label: 'Jun', value: 780 },
  { label: 'Jul', value: 850 },
  { label: 'Aug', value: 920 },
  { label: 'Sep', value: 890 },
  { label: 'Oct', value: 1020 },
  { label: 'Nov', value: 1150 },
  { label: 'Dec', value: 1280 },
];

const mockTournamentActivity = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 15 },
  { label: 'Mar', value: 18 },
  { label: 'Apr', value: 22 },
  { label: 'May', value: 28 },
  { label: 'Jun', value: 35 },
  { label: 'Jul', value: 42 },
  { label: 'Aug', value: 38 },
  { label: 'Sep', value: 45 },
  { label: 'Oct', value: 52 },
  { label: 'Nov', value: 48 },
  { label: 'Dec', value: 56 },
];

const mockUserDistribution = [
  { label: 'Free', value: 8500 },
  { label: 'Premium', value: 2800 },
  { label: 'Pro', value: 950 },
  { label: 'Enterprise', value: 200 },
];

const mockRecentActivity: ActivityItem[] = [
  {
    id: '1',
    action: 'created',
    target: 'Summer Championship 2024',
    targetType: 'Tournament',
    user: 'admin@tdarts.hu',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    icon: 'emoji_events',
  },
  {
    id: '2',
    action: 'updated',
    target: 'Budapest Darts Club',
    targetType: 'Club',
    user: 'manager@club.hu',
    timestamp: new Date(Date.now() - 1000 * 60 * 23),
    icon: 'store',
  },
  {
    id: '3',
    action: 'verified',
    target: 'John Smith',
    targetType: 'Player',
    user: 'admin@tdarts.hu',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    icon: 'verified',
  },
  {
    id: '4',
    action: 'archived',
    target: 'Spring League 2024',
    targetType: 'League',
    user: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    icon: 'archive',
  },
  {
    id: '5',
    action: 'updated settings for',
    target: 'Feature Flags',
    targetType: 'System',
    user: 'admin@tdarts.hu',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    icon: 'settings',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of your tDarts platform metrics and activity"
      />

      {/* KPI Grid */}
      <StatsGrid columns={4}>
        <KpiCard
          title="Total Users"
          value={mockKpis.totalUsers}
          change={mockKpis.userGrowth}
          changeLabel="vs last month"
          icon={<IconUsers className="w-5 h-5" />}
        />
        <KpiCard
          title="Active Clubs"
          value={mockKpis.activeClubs}
          change={mockKpis.clubGrowth}
          changeLabel="vs last month"
          icon={<IconBuildingStore className="w-5 h-5" />}
        />
        <KpiCard
          title="Tournaments This Month"
          value={mockKpis.tournamentsThisMonth}
          change={mockKpis.tournamentGrowth}
          changeLabel="vs last month"
          icon={<IconTrophy className="w-5 h-5" />}
        />
        <KpiCard
          title="Matches Played"
          value={mockKpis.matchesPlayed}
          change={mockKpis.matchGrowth}
          changeLabel="vs last month"
          icon={<IconTargetArrow className="w-5 h-5" />}
        />
      </StatsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          title="User Registrations"
          data={mockRegistrationTrend}
          color="primary"
          height={280}
        />
        <BarChart
          title="Tournament Activity"
          data={mockTournamentActivity}
          color="accent"
          height={280}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DoughnutChart
          title="User Distribution"
          data={mockUserDistribution}
          height={240}
        />
        <RecentActivity
          activities={mockRecentActivity}
          className="lg:col-span-2"
        />
      </div>
    </div>
  );
}
