"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { IconDeviceDesktop, IconDeviceTv, IconEdit, IconRefresh, IconShare2, IconScreenShare } from "@tabler/icons-react";
import { useUserContext } from "@/hooks/useUser";
import { Link } from "@/i18n/routing";
import { shouldShowTournamentLiveTvLinks } from "@/lib/local-calendar-date";
import { reopenTournamentAction } from "@/features/tournaments/actions/reopenTournament.action";
import { useTournamentPageData } from "@/features/tournament/hooks/useTournamentPageData";
import { useTournamentRealtimeRefresh } from "@/features/tournament/hooks/useTournamentRealtimeRefresh";
import { TournamentTabsNavigation } from "@/features/tournament/components/TournamentTabsNavigation";
import TournamentOverview from "@/components/tournament/TournamentOverview";
import TournamentShareModal from "@/components/tournament/TournamentShareModal";
import EditTournamentModal from "@/components/tournament/EditTournamentModal";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { TournamentStatTile } from "@/features/tournament/components/TournamentStatTile";
import { TournamentFormatBadges } from "@/components/tournament/TournamentFormatBadges";

const TournamentPlayers = dynamic(
  () => import("@/components/tournament/TournamentPlayers")
);
const TournamentGroupsView = dynamic(
  () => import("@/components/tournament/TournamentGroupsView")
);
const TournamentBoardsView = dynamic(
  () => import("@/components/tournament/TournamentBoardsView")
);
const TournamentKnockoutBracket = dynamic(
  () => import("@/components/tournament/TournamentKnockoutBracket")
);
const TournamentStatusChanger = dynamic(
  () => import("@/components/tournament/TournamentStatusChanger")
);
const LegsConfigPanel = dynamic(
  () => import("@/components/tournament/LegsConfigPanel")
);

type TournamentPageClientProps = {
  initialData?: any;
  initialSections?: Partial<Record<"players" | "boards" | "groups" | "bracket", any>>;
};

type TournamentSectionView = "overview" | "players" | "boards" | "groups" | "bracket";
/** Includes full summary payload (groups + knockout + boards) for admin / finish flows. */
type TournamentFetchView = TournamentSectionView | "full";
const SECTION_FRESHNESS_MS = 8_000;

const getStatusMeta = (t: (key: string) => string) => ({
  pending: {
    label: t("status.pending.label"),
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    description: t("status.pending.description"),
  },
  "group-stage": {
    label: t("status.group-stage.label"),
    badgeClass: "bg-info/10 text-info border-info/20",
    description: t("status.group-stage.description"),
  },
  knockout: {
    label: t("status.knockout.label"),
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    description: t("status.knockout.description"),
  },
  finished: {
    label: t("status.finished.label"),
    badgeClass: "bg-success/10 text-success border-success/20",
    description: t("status.finished.description"),
  },
});

const getTabs = (t: (key: string) => string) => [
  { value: "overview", label: t("tabs.overview") },
  { value: "players", label: t("tabs.players") },
  { value: "boards", label: t("tabs.boards") },
  { value: "groups", label: t("tabs.groups") },
  { value: "bracket", label: t("tabs.bracket") },
  { value: "admin", label: t("tabs.admin") },
];

const toReadableFormatLabel = (format?: string) => {
  if (!format) return "-";
  if (format === "group_knockout") return "Group + Knockout";
  if (format === "group") return "Group";
  if (format === "knockout") return "Knockout";
  return format
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const TournamentPageClient: React.FC<TournamentPageClientProps> = ({
  initialData,
  initialSections,
}) => {
  const { code } = useParams();
  const searchParams = useSearchParams();
  const { user } = useUserContext();
  const t = useTranslations("Tournament.page");

  const statusMeta = useMemo(
    () =>
      getStatusMeta(t) as Record<
        string,
        { label: string; badgeClass: string; description: string }
      >,
    [t]
  );
  const tabs = useMemo(() => getTabs(t), [t]);

  const {
    tournament,
    players,
    loading,
    error,
    userClubRole,
    userPlayerStatus,
    userPlayerId,
    fetchAll,
    applySseDelta,
    fetchSection,
    boardsDataSyncedAt,
    boardsDataSyncSource,
  } = useTournamentPageData(code, user, t("error.retry"), initialData, initialSections);

  const { isConnected: sseConnected, sessionExpired: sseSessionExpired, isRealtimeEnabled: sseEnabled } =
    useTournamentRealtimeRefresh(
      tournament,
      typeof code === "string" ? code : undefined,
      applySseDelta,
      fetchSection
    );

  const [tournamentShareModal, setTournamentShareModal] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const hostedClub = useMemo(() => {
    const c = tournament?.clubId;
    if (c && typeof c === "object" && c !== null && "_id" in c) {
      const rec = c as { _id?: unknown; name?: string };
      const id = rec._id != null ? String(rec._id) : "";
      const n = rec.name?.trim();
      if (id && n) return { id, name: n };
    }
    return null;
  }, [tournament?.clubId]);
  const lastFetchedAtRef = useRef<Record<TournamentFetchView, number>>({
    overview: Date.now(),
    players: 0,
    boards: 0,
    groups: 0,
    bracket: 0,
    full: 0,
  });
  const invalidatedSectionsRef = useRef<Set<TournamentFetchView>>(new Set());
  const previousTournamentStateRef = useRef<{ status: string; groupCount: number; knockoutRounds: number } | null>(null);
  const getViewForTab = useCallback((tab: string): TournamentFetchView => {
    if (tab === "admin") return "full";
    if (tab === "players" || tab === "boards" || tab === "groups" || tab === "bracket") return tab;
    return "overview";
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((tab) => tab.value === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, tabs]);

  useEffect(() => {
    const now = Date.now();
    lastFetchedAtRef.current = {
      overview: now,
      players: initialSections?.players ? now : 0,
      boards: initialSections?.boards ? now : 0,
      groups: initialSections?.groups ? now : 0,
      bracket: initialSections?.bracket ? now : 0,
      full: 0,
    };
    invalidatedSectionsRef.current.clear();
    previousTournamentStateRef.current = null;
  }, [code, initialSections]);

  useEffect(() => {
    const status = String(tournament?.tournamentSettings?.status || "");
    const groupCount = Array.isArray(tournament?.groups) ? tournament.groups.length : 0;
    const knockoutRounds = Array.isArray(tournament?.knockout) ? tournament.knockout.length : 0;
    const previous = previousTournamentStateRef.current;

    if (previous) {
      const enteredGroupStage = status === "group-stage" && previous.status !== "group-stage";
      const enteredKnockout = status === "knockout" && previous.status !== "knockout";
      const groupStructureChanged = groupCount > previous.groupCount;
      const knockoutStructureChanged = knockoutRounds > previous.knockoutRounds;

      if (enteredGroupStage || groupStructureChanged) {
        invalidatedSectionsRef.current.add("groups");
        invalidatedSectionsRef.current.add("full");
        lastFetchedAtRef.current.groups = 0;
        lastFetchedAtRef.current.full = 0;
      }
      if (enteredKnockout || knockoutStructureChanged) {
        invalidatedSectionsRef.current.add("bracket");
        invalidatedSectionsRef.current.add("full");
        lastFetchedAtRef.current.bracket = 0;
        lastFetchedAtRef.current.full = 0;
      }
    }

    previousTournamentStateRef.current = { status, groupCount, knockoutRounds };
  }, [tournament?.groups, tournament?.knockout, tournament?.tournamentSettings?.status]);

  useEffect(() => {
    if (activeTab === "overview") {
      return;
    }
    const view = getViewForTab(activeTab);
    const now = Date.now();
    const lastFetchedAt = lastFetchedAtRef.current[view];
    const isInvalidated =
      invalidatedSectionsRef.current.has(view) ||
      (view === "full" && invalidatedSectionsRef.current.has("bracket"));
    const isStale = now - lastFetchedAt >= SECTION_FRESHNESS_MS;
    const shouldFetch = lastFetchedAt === 0 || isInvalidated || isStale;
    if (!shouldFetch) {
      return;
    }
    void (async () => {
      try {
        await fetchAll(view, { bypassCache: true });
        const ts = Date.now();
        lastFetchedAtRef.current[view] = ts;
        invalidatedSectionsRef.current.delete(view);
        if (view === "full") {
          invalidatedSectionsRef.current.delete("bracket");
          lastFetchedAtRef.current.bracket = ts;
          lastFetchedAtRef.current.groups = ts;
        }
      } catch (error) {
        console.error("Tab hydration failed:", error);
      }
    })();
  }, [activeTab, fetchAll, getViewForTab]);

  const handleRefetch = useCallback(async () => {
    const view = getViewForTab(activeTab);
    await fetchAll(view, { bypassCache: true });
    const ts = Date.now();
    lastFetchedAtRef.current[view] = ts;
    invalidatedSectionsRef.current.delete(view);
    if (view === "full") {
      invalidatedSectionsRef.current.delete("bracket");
      lastFetchedAtRef.current.bracket = ts;
      lastFetchedAtRef.current.groups = ts;
    }
  }, [activeTab, fetchAll, getViewForTab]);

  const handleTournamentRefresh = useCallback(
    async (options?: { bypassCache?: boolean }) => {
      const view = getViewForTab(activeTab);
      await fetchAll(view, { bypassCache: options?.bypassCache ?? true });
      const ts = Date.now();
      lastFetchedAtRef.current[view] = ts;
      invalidatedSectionsRef.current.delete(view);
      if (view === "full") {
        invalidatedSectionsRef.current.delete("bracket");
        lastFetchedAtRef.current.bracket = ts;
        lastFetchedAtRef.current.groups = ts;
      }
    },
    [activeTab, fetchAll, getViewForTab]
  );

  const handleTournamentRefreshFresh = useCallback(async () => {
    await handleTournamentRefresh({ bypassCache: true });
  }, [handleTournamentRefresh]);

  const handlePlayersRefresh = useCallback(async () => {
    await fetchAll("players", { bypassCache: true });
    lastFetchedAtRef.current.players = Date.now();
    invalidatedSectionsRef.current.delete("players");
  }, [fetchAll]);

  const handleReopenTournament = useCallback(async () => {
    if (!user || !user._id || user.isAdmin !== true) {
      alert(t("admin.reopen.no_permission"));
      return;
    }
    if (!confirm(t("admin.reopen.confirm"))) return;
    try {
      setIsReopening(true);
      const result = await reopenTournamentAction({ code: String(code || "") });
      if (result && typeof result === "object" && "success" in result && result.success) {
        alert(t("admin.reopen.success"));
        await fetchAll();
      }
    } catch (err: any) {
      console.error("Error reopening tournament:", err);
      alert(err.response?.data?.error || t("admin.reopen.error_save"));
    } finally {
      setIsReopening(false);
    }
  }, [code, fetchAll, user, t]);

  const statusInfo = useMemo(() => {
    const status = tournament?.tournamentSettings?.status || "pending";
    return statusMeta[status] || statusMeta.pending;
  }, [tournament?.tournamentSettings?.status, statusMeta]);

  const tournamentStats = useMemo(() => {
    const playersCount =
      Array.isArray(players) && players.length > 0
        ? players.length
        : Number(tournament?.tournamentPlayers?.length || 0);
    const boardsCount = Array.isArray(tournament?.boards) ? tournament.boards.length : 0;
    const format = toReadableFormatLabel(tournament?.tournamentSettings?.format);
    return { playersCount, boardsCount, format };
  }, [players, tournament]);

  const tournamentId =
    typeof tournament?.tournamentId === "string" ? tournament.tournamentId : "";
  const tournamentCode = typeof code === "string" ? code : code?.[0] ?? "";
  const tournamentIdentifier = tournamentId || tournamentCode;
  const showLiveTvLinks = useMemo(
    () =>
      shouldShowTournamentLiveTvLinks(
        tournament?.tournamentSettings?.status,
        tournament?.tournamentSettings?.startDate
      ),
    [tournament?.tournamentSettings?.status, tournament?.tournamentSettings?.startDate]
  );

  const sseBadgeLabel = useMemo(() => {
    if (!sseEnabled) return t("header.sse_na");
    if (sseSessionExpired) return t("header.sse_expired");
    if (sseConnected) return t("header.sse_connected");
    return t("header.sse_offline");
  }, [sseConnected, sseEnabled, sseSessionExpired, t]);

  const sseBadgeClass = useMemo(() => {
    if (!sseEnabled) return "border-border/60 bg-muted/30 text-muted-foreground";
    if (sseSessionExpired) return "border-warning/40 bg-warning/15 text-warning";
    if (sseConnected) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }, [sseConnected, sseEnabled, sseSessionExpired]);

  const canManageTournament = userClubRole === "admin" || userClubRole === "moderator";
  const isGlobalAdmin = user?.isAdmin === true;
  const canSeeAdminControls = canManageTournament || isGlobalAdmin;

  if (loading && !tournament) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-5">
            <Skeleton className="h-8 w-72" />
            <div className="mt-4 flex gap-3">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-destructive/40 bg-card">
          <CardContent className="space-y-4 p-6">
            <Alert variant="destructive">
              <AlertTitle>{t("error.title")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => fetchAll()} className="w-full">
              {t("error.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-dashed">
          <CardContent className="space-y-4 py-8 text-center">
            <div className="text-4xl">🏆</div>
            <p className="text-base font-semibold text-foreground">
              {t("error.not_found.title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("error.not_found.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background pb-28 md:pb-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, var(--color-primary) 0%, transparent 38%), radial-gradient(circle at 90% 15%, var(--color-accent) 0%, transparent 30%)",
        }}
      />
      <div className="container relative mx-auto space-y-4 px-4 py-3 md:space-y-6 md:py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-4 pb-28 md:gap-5 md:pb-0"
        >
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="md:hidden z-50 sticky top-0">
              <TournamentTabsNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                userClubRole={userClubRole}
                isGlobalAdmin={isGlobalAdmin}
                format={tournament?.tournamentSettings?.format}
                scorerHref={tournamentIdentifier ? `/board/${tournamentIdentifier}` : undefined}
                scorerLabel={t("header.boards_writer")}
                liveHref={
                  showLiveTvLinks && tournamentIdentifier
                    ? `/tournaments/${tournamentIdentifier}/live`
                    : undefined
                }
                liveLabel={t("header.live_open")}
                liveEnabled={showLiveTvLinks}
                mobileActionRow
                onMobileRefresh={handleRefetch}
                mobileRefreshLabel={t("header.refresh")}
                mobileRefreshPending={loading}
              />
            </div>
            <header
              className={`rounded-2xl border border-border/70 bg-card/85 p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl md:rounded-3xl md:p-6 ${
                activeTab !== "overview" ? "hidden md:block" : ""
              }`}
            >
              <div className="space-y-2.5 md:space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusInfo.badgeClass}>
                    {statusInfo.label}
                  </Badge>
                  <span className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {t("header.tournament_code", { code: tournament.tournamentId })}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${sseBadgeClass}`}
                    title={sseBadgeLabel}
                  >
                    {sseBadgeLabel}
                  </span>
                  <TournamentFormatBadges
                    type={tournament?.tournamentSettings?.type}
                    participationMode={tournament?.tournamentSettings?.participationMode}
                    size="md"
                  />
                </div>
                <h1 className="text-xl font-bold leading-tight text-foreground md:text-4xl">
                  {tournament.tournamentSettings?.name || t("tabs.overview")}
                </h1>
                {hostedClub ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="mr-1">{t("header.hosted_by_label")}</span>
                    <Link
                      href={`/clubs/${hostedClub.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {hostedClub.name}
                    </Link>
                  </p>
                ) : null}
                <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground md:text-base">
                  {statusInfo.description}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {canManageTournament && tournament?.tournamentSettings?.status !== "finished" ? (
                    <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="gap-2">
                      <IconEdit className="h-4 w-4" />
                      {t("tabs.overview")}
                    </Button>
                  ) : null}
                  {isGlobalAdmin && tournament?.tournamentSettings?.status === "finished" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReopenTournament}
                      disabled={isReopening}
                      className="gap-2"
                    >
                      <IconRefresh className="h-4 w-4" />
                      {isReopening ? t("admin.reopen.btn_loading") : t("admin.reopen.btn")}
                    </Button>
                  ) : null}
                  {showLiveTvLinks && tournamentCode ? (
                    <>
                      <Button asChild size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link href={`/tournaments/${tournamentCode}/live`} target="_blank" rel="noopener noreferrer">
                          <IconScreenShare className="h-4 w-4" />
                          {t("header.live_open")}
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="gap-2 bg-sky-600 text-white hover:bg-sky-600/90">
                        <Link href={`/tournaments/${tournamentCode}/tv`} target="_blank" rel="noopener noreferrer">
                          <IconDeviceTv className="h-4 w-4" />
                          {t("header.tv_view")}
                        </Link>
                      </Button>
                    </>
                  ) : null}
                  <Button variant="secondary" size="sm" onClick={handleRefetch} className="gap-2">
                    <IconRefresh className="h-4 w-4" />
                    {t("header.refresh")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTournamentShareModal(true)} className="gap-2">
                    <IconShare2 className="h-4 w-4" />
                    {t("header.share")}
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 md:mt-4 md:gap-2.5">
                <TournamentStatTile label={t("tabs.players")} value={tournamentStats.playersCount} />
                <TournamentStatTile label={t("tabs.boards")} value={tournamentStats.boardsCount} />
                <TournamentStatTile label="Format" value={tournamentStats.format} />
              </div>
            </header>
            <div className="hidden md:block">
              <TournamentTabsNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                userClubRole={userClubRole}
                isGlobalAdmin={isGlobalAdmin}
                format={tournament?.tournamentSettings?.format}
                scorerHref={tournamentIdentifier ? `/board/${tournamentIdentifier}` : undefined}
                scorerLabel={t("header.boards_writer")}
                liveHref={
                  showLiveTvLinks && tournamentIdentifier
                    ? `/tournaments/${tournamentIdentifier}/live`
                    : undefined
                }
                liveLabel={t("header.live_open")}
                liveEnabled={showLiveTvLinks}
              />
            </div>

            <TabsContent value="overview" className="mt-0 space-y-4">
              <TournamentOverview
                tournament={tournament}
                userRole={userClubRole}
                userPlayerStatus={userPlayerStatus}
                isLoggedIn={Boolean(user?._id)}
              />
            </TabsContent>

            <TabsContent value="players" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
              <TournamentPlayers
                tournament={tournament}
                players={players}
                userClubRole={userClubRole}
                userPlayerStatus={userPlayerStatus}
                userPlayerId={userPlayerId}
                status={tournament.tournamentSettings?.status}
                onRefresh={handlePlayersRefresh}
              />
            </TabsContent>

            <TabsContent value="boards" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
              <TournamentBoardsView
                tournament={tournament}
                userClubRole={userClubRole}
                dataSyncedAt={boardsDataSyncedAt ?? undefined}
                dataSyncSource={boardsDataSyncSource ?? undefined}
              />
            </TabsContent>

            {tournament?.tournamentSettings?.format !== "knockout" && (
              <TabsContent value="groups" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
                <TournamentStatusChanger
                  tournament={tournament}
                  userClubRole={userClubRole}
                  onRefetch={handleTournamentRefreshFresh}
                  section="groups"
                />
                <TournamentGroupsView
                  tournament={tournament}
                  userClubRole={userClubRole}
                  onDataChanged={handleTournamentRefreshFresh}
                />
              </TabsContent>
            )}

            {tournament?.tournamentSettings?.format !== "group" && (
              <TabsContent value="bracket" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
                <TournamentStatusChanger
                  tournament={tournament}
                  userClubRole={userClubRole}
                  onRefetch={handleTournamentRefreshFresh}
                  section="knockout"
                />
                <TournamentKnockoutBracket
                  tournamentCode={tournament.tournamentId}
                  tournament={tournament}
                  userClubRole={userClubRole}
                  tournamentPlayers={players}
                  knockoutMethod={tournament.tournamentSettings?.knockoutMethod}
                  clubId={tournament.clubId?.toString()}
                />
              </TabsContent>
            )}

            <TabsContent value="admin" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
              <TournamentStatusChanger
                tournament={tournament}
                userClubRole={userClubRole}
                onRefetch={handleTournamentRefreshFresh}
                section="all"
              />
              <LegsConfigPanel
                tournament={tournament}
                userClubRole={userClubRole}
                onRefetch={handleTournamentRefreshFresh}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <TournamentShareModal
        isOpen={tournamentShareModal}
        onClose={() => setTournamentShareModal(false)}
        tournamentCode={tournament.tournamentId}
        tournamentName={tournament.tournamentSettings?.name || t("tabs.overview")}
      />
      {editModalOpen && user?._id && canSeeAdminControls && (
        <EditTournamentModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          tournament={tournament}
          userId={user._id}
          onTournamentUpdated={handleRefetch}
        />
      )}
    </div>
  );
};

export default TournamentPageClient;
