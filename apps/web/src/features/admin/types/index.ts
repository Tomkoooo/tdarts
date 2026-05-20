/** Frontend view types for the admin panel. Align with @tdarts/core models and admin query services. */

export type AdminUserStatus = 'active' | 'suspended' | 'banned' | 'deleted';

export type AdminUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  adminRoles: string[];
  authProvider?: string;
  lastLogin: string | null;
  isDeleted: boolean;
  createdAt: string;
};

export type AdminPlayer = {
  id: string;
  name: string;
  userRef?: string;
  clubIds: string[];
  rating: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  status: string;
};

export type AdminClub = {
  id: string;
  name: string;
  code: string;
  city?: string;
  memberCount: number;
  isActive: boolean;
  logoUrl?: string;
};

export type AdminTournament = {
  id: string;
  name: string;
  code: string;
  status: string;
  format: string;
  category?: string;
  startDate?: string;
  participantCount: number;
  capacity: number;
  clubId: string;
};

export type AdminLeague = {
  id: string;
  name: string;
  status: string;
  season?: string;
  clubId: string;
  playerCount: number;
};

export type AdminMatch = {
  id: string;
  tournamentId?: string;
  leagueId?: string;
  player1Name: string;
  player2Name: string;
  status: string;
  scheduledAt?: string;
  score?: string;
  round?: string;
};

export type AdminFeedback = {
  id: string;
  subject: string;
  type: string;
  priority: string;
  status: string;
  senderEmail?: string;
  createdAt: string;
  unreadCount: number;
};

export type AdminAuditLogEntry = {
  id: string;
  operation: string;
  message: string;
  actorId?: string;
  actorName?: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
};

export type AdminDashboardRange = '24h' | '7d' | '30d';

export type AdminMetricTrend = {
  current: number;
  previous: number;
  periodLabel: string;
};

export type AdminDashboardSummary = {
  range: AdminDashboardRange;
  usersTotal: number;
  usersLast7d: number;
  usersNew24h: number;
  usersDelta24h: number;
  usersTrend: AdminMetricTrend;
  clubsActive: number;
  clubsNew24h: number;
  clubsDelta24h: number;
  clubsTrend: AdminMetricTrend;
  tournamentsByStatus: Record<string, number>;
  tournamentsTotal: number;
  feedbackOpenHigh: number;
  userSignupsByDay: { day: string; count: number }[];
  feedbackOpenByPriority: Record<string, number>;
  apiErrorEvents24h: number;
  apiErrorsDelta24h: number;
  apiErrorsTrend: AdminMetricTrend;
  topErrorRoutes: { routeKey: string; method: string; errors: number }[];
  recentAdminActivity: {
    id: string;
    operation: string;
    message: string;
    timestamp: string;
  }[];
  activityFeed: AdminDashboardActivityItem[];
};

export type AdminDashboardActivityItem = {
  id: string;
  kind:
    | 'user_signup'
    | 'club_activity'
    | 'tournament_change'
    | 'feedback_unread'
    | 'critical_feedback'
    | 'api_errors'
    | 'api_spike';
  title: string;
  subtitle?: string;
  href?: string;
  timestamp: string;
  tone: 'default' | 'warning' | 'critical';
};

export type ChartPoint = { label: string; value: number };

export type AdminSessionContext = {
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    adminRoles: string[];
    profilePicture?: string;
  };
  capabilities: string[];
};
