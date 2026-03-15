"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import axios from "axios";
import { useParams, useSearchParams } from "next/navigation";
import { useUserContext } from "@/hooks/useUser";
import { useTournamentPageData } from "@/features/tournament/hooks/useTournamentPageData";
import { useTournamentRealtimeRefresh } from "@/features/tournament/hooks/useTournamentRealtimeRefresh";
import { TournamentHeaderActions } from "@/features/tournament/components/TournamentHeaderActions";
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
      const response = await axios.post(`/api/tournaments/${code}/reopen`);
      if (response.data.success) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, var(--color-primary) 0%, transparent 38%), radial-gradient(circle at 90% 15%, var(--color-accent) 0%, transparent 30%)",
        }}
      />
      <div className="container relative mx-auto space-y-6 px-4 py-6 md:py-8">
        <header className="rounded-2xl border border-border/70 bg-card/70 p-5 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.25)] flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {tournament.tournamentSettings?.name || t("tabs.overview")}
              </h1>
              <Badge variant="outline" className={statusInfo.badgeClass}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {statusInfo.description}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t("header.tournament_code", {
                  code: tournament.tournamentId,
                })}
              </span>
            </div>
          </div>
          <TournamentHeaderActions
            tournament={tournament}
            code={code ?? ""}
            onRefetch={handleRefetch}
            refreshLabel={t("header.refresh")}
            boardsWriterLabel={t("header.boards_writer")}
            liveLabel={tTour("overview.btn_live")}
            tvViewLabel={t("header.tv_view")}
          />
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-6 pb-24 md:pb-0"
        >
          <div className="flex flex-col gap-3 -mx-4 px-4 pb-6">
            <TournamentTabsNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userClubRole={userClubRole}
              format={tournament?.tournamentSettings?.format}
            />

            <TabsContent value="overview" className="mt-0 space-y-6">
              <TournamentOverview
                tournament={tournament}
                userRole={userClubRole}
                onEdit={() => setEditModalOpen(true)}
                onRefetch={handleRefetch}
                onShare={() => setTournamentShareModal(true)}
                shareLabel={t("header.share")}
              />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {t("sections.boards_status")}
                </h3>
                <TournamentBoardsView
                  tournament={tournament}
                  userClubRole={userClubRole}
                />
              </div>
              {tournament.groups && tournament.groups.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t("sections.groups_matches")}
                  </h3>
                  <TournamentGroupsView
                    tournament={tournament}
                    userClubRole={userClubRole}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="players" className="mt-0 space-y-4">
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

            <TabsContent value="boards" className="mt-0 space-y-4">
              <TournamentBoardsView
                tournament={tournament}
                userClubRole={userClubRole}
              />
            </TabsContent>

            {tournament?.tournamentSettings?.format !== "knockout" && (
              <TabsContent value="groups" className="mt-0 space-y-4">
                <TournamentGroupsView
                  tournament={tournament}
                  userClubRole={userClubRole}
                />
              </TabsContent>
            )}

            {tournament?.tournamentSettings?.format !== "group" && (
              <TabsContent value="bracket" className="mt-0 space-y-4">
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
