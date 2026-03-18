"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { IconDeviceDesktop, IconDeviceTv, IconEdit, IconRefresh, IconScreenShare, IconShare2 } from "@tabler/icons-react";
import { useUserContext } from "@/hooks/useUser";
import { reopenTournamentAction } from "@/features/tournaments/actions/reopenTournament.action";
import { useTournamentPageData } from "@/features/tournament/hooks/useTournamentPageData";
import { useTournamentRealtimeRefresh } from "@/features/tournament/hooks/useTournamentRealtimeRefresh";
import { TournamentTabsNavigation } from "@/features/tournament/components/TournamentTabsNavigation";
import TournamentOverview from "@/components/tournament/TournamentOverview";
import TournamentPlayers from "@/components/tournament/TournamentPlayers";
import TournamentGroupsGenerator from "@/components/tournament/TournamentStatusChanger";
import TournamentGroupsView from "@/components/tournament/TournamentGroupsView";
import TournamentBoardsView from "@/components/tournament/TournamentBoardsView";
import TournamentKnockoutBracket from "@/components/tournament/TournamentKnockoutBracket";
import TournamentShareModal from "@/components/tournament/TournamentShareModal";
import EditTournamentModal from "@/components/tournament/EditTournamentModal";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { TournamentStatTile } from "@/features/tournament/components/TournamentStatTile";

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
  if (!format) return "-"
  if (format === "group_knockout") return "Group + Knockout"
  if (format === "group") return "Group"
  if (format === "knockout") return "Knockout"
  return format
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const TournamentPage = () => {
  const { code } = useParams();
  const searchParams = useSearchParams();
  const { user } = useUserContext();
  const t = useTranslations("Tournament.page");
  const tTour = useTranslations("Tournament");

  const statusMeta = useMemo(
    () => getStatusMeta(t) as Record<string, { label: string; badgeClass: string; description: string }>,
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
    silentRefresh,
  } = useTournamentPageData(code, user, t("error.retry"));

  useTournamentRealtimeRefresh(tournament, typeof code === "string" ? code : undefined, silentRefresh);

  const [tournamentShareModal, setTournamentShareModal] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((tab) => tab.value === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, tabs]);

  const handleRefetch = useCallback(() => {
    fetchAll();
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
    const playersCount = Array.isArray(players) ? players.length : 0;
    const boardsCount = Array.isArray(tournament?.boards) ? tournament.boards.length : 0;
    const format = toReadableFormatLabel(tournament?.tournamentSettings?.format);
    return { playersCount, boardsCount, format };
  }, [players, tournament]);

  const tournamentId =
    typeof tournament?.tournamentId === "string" ? tournament.tournamentId : "";
  const tournamentCode = typeof code === "string" ? code : code?.[0] ?? "";
  const tournamentIdentifier = tournamentId || tournamentCode;
  const showLive = ["group-stage", "knockout"].includes(
    tournament?.tournamentSettings?.status || ""
  );
  const canManageTournament = userClubRole === "admin" || userClubRole === "moderator";

  if (loading) {
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
            <Button onClick={fetchAll} className="w-full">
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
    <div className="relative min-h-screen bg-background pb-20 md:pb-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, var(--color-primary) 0%, transparent 38%), radial-gradient(circle at 90% 15%, var(--color-accent) 0%, transparent 30%)",
        }}
      />
      <div className="container relative mx-auto space-y-4 px-4 py-4 md:space-y-6 md:py-8">
        <header className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl md:rounded-3xl md:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusInfo.badgeClass}>
                {statusInfo.label}
              </Badge>
              <span className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                {t("header.tournament_code", { code: tournament.tournamentId })}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-foreground md:text-4xl">
              {tournament.tournamentSettings?.name || t("tabs.overview")}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {statusInfo.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canManageTournament && tournament?.tournamentSettings?.status !== "finished" ? (
                <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="gap-2">
                  <IconEdit className="h-4 w-4" />
                  {tTour("overview.btn_edit")}
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={handleRefetch} className="gap-2">
                <IconRefresh className="h-4 w-4" />
                {t("header.refresh")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTournamentShareModal(true)} className="gap-2">
                <IconShare2 className="h-4 w-4" />
                {t("header.share")}
              </Button>
              {tournamentIdentifier ? (
                showLive ? (
                  <Button
                    asChild
                    size="sm"
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
                  >
                    <Link href={`/tournaments/${tournamentIdentifier}/live`} target="_blank" rel="noopener noreferrer">
                      <IconScreenShare className="h-4 w-4" />
                      {tTour("overview.btn_live")}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="gap-2 bg-emerald-600/65 text-white opacity-70"
                  >
                    <IconScreenShare className="h-4 w-4" />
                    {tTour("overview.btn_live")}
                  </Button>
                )
              ) : null}
              {tournamentIdentifier ? (
                <Button
                  asChild
                  size="sm"
                  className="gap-2 bg-sky-600 text-white hover:bg-sky-600/90"
                >
                  <Link href={`/tournaments/${tournamentIdentifier}/tv`} target="_blank" rel="noopener noreferrer">
                    <IconDeviceTv className="h-4 w-4" />
                    {t("header.tv_view")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <TournamentStatTile label={t("tabs.players")} value={tournamentStats.playersCount} />
            <TournamentStatTile label={t("tabs.boards")} value={tournamentStats.boardsCount} />
            <TournamentStatTile label="Format" value={tournamentStats.format} />
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-4 pb-24 md:gap-5 md:pb-0"
        >
          <div className="flex flex-col gap-3 md:gap-4">
            <TournamentTabsNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userClubRole={userClubRole}
              format={tournament?.tournamentSettings?.format}
              scorerHref={tournamentIdentifier ? `/board/${tournamentIdentifier}` : undefined}
              liveHref={tournamentIdentifier ? `/tournaments/${tournamentIdentifier}/live` : undefined}
              liveEnabled={showLive}
            />

            {activeTab !== "overview" ? (
              <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("overview")} className="px-2">
                  ← {t("tabs.overview")}
                </Button>
              </div>
            ) : null}

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
                onRefresh={fetchAll}
              />
            </TabsContent>

            <TabsContent value="boards" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/70 p-2.5">
                <Button variant="secondary" size="sm" onClick={handleRefetch} className="gap-2">
                  <IconRefresh className="h-4 w-4" />
                  {t("header.refresh")}
                </Button>
                {tournamentIdentifier ? (
                  <Button asChild size="sm" className="gap-2">
                    <Link href={`/board/${tournamentIdentifier}`} target="_blank" rel="noopener noreferrer">
                      <IconDeviceDesktop className="h-4 w-4" />
                      {t("header.boards_writer")}
                    </Link>
                  </Button>
                ) : null}
                {showLive && tournamentIdentifier ? (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/tournaments/${tournamentIdentifier}/live`} target="_blank" rel="noopener noreferrer">
                      <IconScreenShare className="h-4 w-4" />
                      {tTour("overview.btn_live")}
                    </Link>
                  </Button>
                ) : null}
                {tournamentIdentifier ? (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/tournaments/${tournamentIdentifier}/tv`} target="_blank" rel="noopener noreferrer">
                      <IconDeviceTv className="h-4 w-4" />
                      {t("header.tv_view")}
                    </Link>
                  </Button>
                ) : null}
              </div>
              <TournamentBoardsView
                tournament={tournament}
                userClubRole={userClubRole}
              />
            </TabsContent>

            {tournament?.tournamentSettings?.format !== "knockout" && (
              <TabsContent value="groups" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
                {canManageTournament ? (
                  <Card className="bg-card/90 shadow-lg shadow-black/30">
                    <CardContent className="p-4">
                      <TournamentGroupsGenerator
                        tournament={tournament}
                        userClubRole={userClubRole}
                        onRefetch={handleRefetch}
                        section="groups"
                      />
                    </CardContent>
                  </Card>
                ) : null}
                <TournamentGroupsView
                  tournament={tournament}
                  userClubRole={userClubRole}
                />
              </TabsContent>
            )}

            {tournament?.tournamentSettings?.format !== "group" && (
              <TabsContent value="bracket" className="mt-0 space-y-4 rounded-2xl border border-border/60 bg-card/55 p-3 backdrop-blur-lg md:p-4">
                {canManageTournament ? (
                  <Card className="bg-card/90 shadow-lg shadow-black/30">
                    <CardContent className="p-4">
                      <TournamentGroupsGenerator
                        tournament={tournament}
                        userClubRole={userClubRole}
                        onRefetch={handleRefetch}
                        section="knockout"
                      />
                    </CardContent>
                  </Card>
                ) : null}
                <TournamentKnockoutBracket
                  tournamentCode={tournament.tournamentId}
                  userClubRole={userClubRole}
                  tournamentPlayers={players}
                  knockoutMethod={
                    tournament.tournamentSettings?.knockoutMethod
                  }
                  clubId={tournament.clubId?.toString()}
                />
              </TabsContent>
            )}

            <TabsContent value="admin" className="mt-0 space-y-6">
              {userClubRole === "admin" || userClubRole === "moderator" ? (
                <Card className="bg-card/90 shadow-lg shadow-black/30">
                  <CardContent className="p-4">
                    <TournamentGroupsGenerator
                      tournament={tournament}
                      userClubRole={userClubRole}
                      onRefetch={handleRefetch}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/90 shadow-lg shadow-black/30">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {t("admin.no_permission")}
                  </CardContent>
                </Card>
              )}
              {user?.isAdmin === true &&
                tournament?.tournamentSettings?.status === "finished" && (
                  <Card className="bg-destructive/15 shadow-lg shadow-black/25">
                    <CardContent className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTitle>{t("admin.reopen.title")}</AlertTitle>
                        <AlertDescription>
                          {t("admin.reopen.description")}
                        </AlertDescription>
                      </Alert>
                      <Button
                        variant="destructive"
                        onClick={handleReopenTournament}
                        disabled={isReopening}
                        className="gap-2"
                      >
                        {isReopening
                          ? t("admin.reopen.btn_loading")
                          : t("admin.reopen.btn")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <TournamentShareModal
        isOpen={tournamentShareModal}
        onClose={() => setTournamentShareModal(false)}
        tournamentCode={tournament.tournamentId}
        tournamentName={
          tournament.tournamentSettings?.name || t("tabs.overview")
        }
      />

      {editModalOpen && user?._id && (
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

export default TournamentPage;
