import { cookies } from "next/headers";
import AuthenticatedHomeContent, {
  type HomeInitialData,
} from "@/components/home/AuthenticatedHomeContent";
import { getUserTournamentsAction } from "@/features/tournaments/actions/getUserTournaments.action";
import { getUserTimeZone } from "@/lib/date-time";
import { getPlayerStatsAction } from "@/features/profile/actions/getPlayerStats.action";
import { getLeagueHistoryAction } from "@/features/profile/actions/getLeagueHistory.action";
import { getActiveAnnouncementsAction } from "@/features/announcements/actions/getActiveAnnouncements.action";
import { checkFeatureFlagAction } from "@/features/feature-flags/actions/checkFeatureFlags.action";
import type {
  HomeLeagueStanding,
  HomeMetrics,
  HomeProfileCompletenessIssue,
  HomeTournament,
} from "@/features/home/ui";

interface HomeServerShellProps {
  locale: string;
  serverUserName?: string;
  serverUsername?: string;
  serverProfilePicture?: string;
}

interface Announcement {
  _id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "error";
  isActive: boolean;
  showButton: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration: number;
  expiresAt: string;
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toHomeTournament(item: any): HomeTournament {
  return {
    _id: String(item?._id || ""),
    name: item?.name || "Tournament",
    code: item?.code || item?.tournamentCode || "",
    date: item?.startDate || item?.date || null,
    status: item?.status || "pending",
    currentPlayers: toSafeNumber(item?.currentPlayers),
    maxPlayers: toSafeNumber(item?.maxPlayers),
    entryFee: toSafeNumber(item?.entryFee),
    wins: toSafeNumber(item?.wins),
    losses: toSafeNumber(item?.losses),
    legsWon: toSafeNumber(item?.legsWon),
    legsLost: toSafeNumber(item?.legsLost),
    nextMatchType: item?.nextMatchType || "unknown",
    nextMatchBoard: typeof item?.nextMatchBoard === "number" ? item.nextMatchBoard : null,
    nextMatchOpponentName:
      typeof item?.nextMatchOpponentName === "string" && item.nextMatchOpponentName.trim()
        ? item.nextMatchOpponentName.trim()
        : null,
    tournamentType: item?.tournamentType === "open" ? "open" : item?.tournamentType === "amateur" ? "amateur" : undefined,
    participationMode:
      item?.participationMode === "pair" || item?.participationMode === "team"
        ? item.participationMode
        : item?.participationMode === "individual"
          ? "individual"
          : undefined,
  };
}

function toHomeMetrics(statsData: any): HomeMetrics {
  const summary = (statsData?.summary || {}) as any;
  const playerStats = (statsData?.player?.stats || {}) as any;
  const currentSeasonTournamentCount = Array.isArray(statsData?.player?.tournamentHistory)
    ? statsData.player.tournamentHistory.length
    : Number(summary.totalTournaments || 0);
  const previousSeasonsTournamentCount = Array.isArray(statsData?.player?.previousSeasons)
    ? statsData.player.previousSeasons.reduce(
        (acc: number, season: any) =>
          acc + (Array.isArray(season?.tournamentHistory) ? season.tournamentHistory.length : 0),
        0
      )
    : 0;
  const lifetimeTournamentCount = currentSeasonTournamentCount + previousSeasonsTournamentCount;
  const globalRankRaw = statsData?.player?.globalRank;
  const globalRank = typeof globalRankRaw === "number" ? globalRankRaw : null;

  return {
    matchesPlayed: Number(summary.wins || 0) + Number(summary.losses || 0),
    winRate: Number(summary.winRate || 0),
    tournamentsJoined: Math.max(
      lifetimeTournamentCount,
      Number(playerStats.tournamentsPlayed || 0),
      Number(summary.totalTournaments || 0)
    ),
    currentRanking: globalRank,
  };
}

function resolveHomeTournamentTimeZone(cookieValue: string | undefined): string {
  if (cookieValue) {
    try {
      return decodeURIComponent(cookieValue);
    } catch {
      /* fall through */
    }
  }
  return getUserTimeZone();
}

export default async function HomeServerShell({
  locale,
  serverUserName,
  serverUsername,
  serverProfilePicture,
}: HomeServerShellProps) {
  const cookieStore = await cookies();
  const homeTournamentTimeZone = resolveHomeTournamentTimeZone(cookieStore.get("user-timezone")?.value);

  const [
    tournamentsRes,
    statsRes,
    leaguesRes,
    featureRes,
    announcementsRes,
  ] = await Promise.allSettled([
    getUserTournamentsAction({ limit: 50, timeZone: homeTournamentTimeZone }),
    getPlayerStatsAction(),
    getLeagueHistoryAction(),
    checkFeatureFlagAction({ feature: "ADVANCED_STATISTICS" }),
    getActiveAnnouncementsAction({ locale }),
  ]);

  const initialData: HomeInitialData = {
    tournaments: [],
    metrics: {
      matchesPlayed: 0,
      winRate: 0,
      tournamentsJoined: 0,
      currentRanking: null,
    },
    leagueStandings: [],
    announcements: [],
    advancedStatsEnabled: false,
    profileCompleteness: { issues: [] as HomeProfileCompletenessIssue[], count: 0 },
  };

  if (
    tournamentsRes.status === "fulfilled" &&
    tournamentsRes.value &&
    typeof tournamentsRes.value === "object" &&
    "success" in tournamentsRes.value &&
    tournamentsRes.value.success &&
    Array.isArray((tournamentsRes.value as any).data)
  ) {
    initialData.tournaments = (tournamentsRes.value as any).data.map(toHomeTournament);
  }

  if (
    statsRes.status === "fulfilled" &&
    statsRes.value &&
    typeof statsRes.value === "object" &&
    "success" in statsRes.value &&
    (statsRes.value as any).success
  ) {
    const statsPayload = (statsRes.value as any).data;
    initialData.metrics = toHomeMetrics(statsPayload);
    const pc = statsPayload?.profileCompleteness;
    if (pc && typeof pc === "object" && Array.isArray(pc.issues)) {
      initialData.profileCompleteness = {
        issues: pc.issues.filter((x: unknown) => x === "photo" || x === "country") as HomeProfileCompletenessIssue[],
        count: typeof pc.count === "number" ? pc.count : pc.issues.length,
      };
    }
  }

  if (
    leaguesRes.status === "fulfilled" &&
    leaguesRes.value &&
    typeof leaguesRes.value === "object" &&
    "success" in leaguesRes.value &&
    (leaguesRes.value as any).success &&
    Array.isArray((leaguesRes.value as any).data)
  ) {
    initialData.leagueStandings = (leaguesRes.value as any).data as HomeLeagueStanding[];
  }

  if (
    featureRes.status === "fulfilled" &&
    featureRes.value &&
    typeof featureRes.value === "object" &&
    "enabled" in featureRes.value
  ) {
    initialData.advancedStatsEnabled = Boolean((featureRes.value as any).enabled);
  }

  if (
    announcementsRes.status === "fulfilled" &&
    announcementsRes.value &&
    typeof announcementsRes.value === "object" &&
    "success" in announcementsRes.value &&
    (announcementsRes.value as any).success &&
    Array.isArray((announcementsRes.value as any).announcements)
  ) {
    const now = new Date();
    initialData.announcements = ((announcementsRes.value as any).announcements as Announcement[]).filter(
      (announcement) => announcement.isActive && new Date(announcement.expiresAt) > now
    );
  }

  return (
    <AuthenticatedHomeContent
      initialData={initialData}
      serverUserName={serverUserName}
      serverUsername={serverUsername}
      serverProfilePicture={serverProfilePicture}
    />
  );
}
