"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useUserContext } from "@/hooks/useUser";
import {
  getPlayerStatsAction,
  getTicketsAction,
  getLeagueHistoryAction,
  updateProfileAction,
  verifyEmailAction,
  resendVerificationAction,
} from "@/features/profile/actions";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import CurrentInfoSection from "@/components/profile/CurrentInfoSection";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import EmailVerificationSection from "@/components/profile/EmailVerificationSection";
import PlayerStatisticsSection from "@/components/profile/PlayerStatisticsSection";
import LeagueHistorySection from "@/components/profile/LeagueHistorySection";
import ProfileActionsSection from "@/components/profile/ProfileActionsSection";
import TicketList from "@/components/profile/TicketList";
import TicketDetail from "@/components/profile/TicketDetail";
import LegsViewModal from "@/components/tournament/LegsViewModal";
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets";
import { useTranslations } from "next-intl";
import GoogleAuthSection from "@/components/profile/GoogleAuthSection";
import { useLogout } from "@/hooks/useLogout";
import { getMatchByIdClientAction } from "@/features/tournaments/actions/tournamentRoster.action";

export function ProfilePageClient() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useUserContext();
  const userId = user?._id;
  const { logout } = useLogout();

  const [activeTab, setActiveTab] = React.useState<"details" | "stats" | "tickets">("details");
  const [isLoading, setIsLoading] = React.useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = React.useState(false);
  const [playerStats, setPlayerStats] = React.useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);
  const [isResendingCode, setIsResendingCode] = React.useState(false);
  const [showLegsModal, setShowLegsModal] = React.useState(false);
  const [selectedMatch, setSelectedMatch] = React.useState<any>(null);
  const [leagueHistory, setLeagueHistory] = React.useState<any[]>([]);
  const [isLoadingLeagueHistory, setIsLoadingLeagueHistory] = React.useState(false);
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null);
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [ticketToastDismissed, setTicketToastDismissed] = React.useState(false);
  const { unreadCount, refresh: refreshUnreadCount } = useUnreadTickets({ enabled: Boolean(userId) });

  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "stats" || tab === "tickets" || tab === "details") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  React.useEffect(() => {
    const dismissed = localStorage.getItem("ticketToastDismissed");
    if (dismissed) setTicketToastDismissed(true);
  }, []);

  React.useEffect(() => {
    if (!userId) return;
    setNeedsEmailVerification(!user?.isVerified);
    loadPlayerStats();
    loadLeagueHistory();
    loadTickets();
  }, [user?.isVerified, userId]);

  const loadPlayerStats = async () => {
    if (!userId) return;
    setIsLoadingStats(true);
    try {
      const result = await getPlayerStatsAction();
      if (typeof result === "object" && "success" in result && result.success) {
        setPlayerStats(result.data);
      }
    } catch (error) {
      console.error("Error loading player stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadTickets = async () => {
    if (!userId) return;
    try {
      const result = await getTicketsAction();
      if (typeof result === "object" && "success" in result && result.success) {
        setTickets(result.data);
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  const loadLeagueHistory = async () => {
    if (!userId) return;
    setIsLoadingLeagueHistory(true);
    try {
      const result = await getLeagueHistoryAction();
      if (typeof result === "object" && "success" in result && result.success) {
        setLeagueHistory(result.data);
      }
    } catch (error) {
      console.error("Error loading league history:", error);
    } finally {
      setIsLoadingLeagueHistory(false);
    }
  };

  const onProfileSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const updateData: any = {
        email: data.email,
        name: data.name,
        username: data.username,
        country: data.country,
      };
      if (data.password?.trim?.()) {
        updateData.password = data.password;
        updateData.confirmPassword = data.confirmPassword;
      }

      const result = await updateProfileAction(updateData);
      if (typeof result === "object" && "ok" in result && !result.ok) {
        toast.error((result as any).message || t("toasts.update_error"));
        return;
      }
      if (typeof result === "object" && "user" in result && result.user) {
        const res = result as { user: any };
        setUser({
          ...user!,
          email: res.user.email || user!.email,
          name: res.user.name || user!.name,
          username: res.user.username || user!.username,
          country: res.user.country ?? user!.country,
          isVerified: data.email && data.email !== user!.email ? false : (res.user.isVerified ?? user!.isVerified),
        });
        setNeedsEmailVerification(data.email !== user!.email && !!data.email);
        toast.success(t("toasts.update_success"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("toasts.update_error"));
      console.error("Update profile error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySubmit = async (data: { code: string }) => {
    setIsLoading(true);
    try {
      const result = await verifyEmailAction(data);
      if (typeof result === "object" && "success" in result && result.success) {
        setUser({ ...user!, isVerified: true });
        setNeedsEmailVerification(false);
        toast.success(t("toasts.verification_success"));
      } else if (typeof result === "object" && "ok" in result && !result.ok) {
        toast.error((result as any).message || t("toasts.verification_error"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("toasts.verification_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);
    try {
      const result = await resendVerificationAction();
      if (typeof result === "object" && "success" in result && result.success) {
        toast.success(t("toasts.resend_success"));
      } else if (typeof result === "object" && "ok" in result && !result.ok) {
        toast.error((result as any).message || t("toasts.resend_error"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("toasts.resend_error"));
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleViewLegs = async (match: any) => {
    const matchId = match?._id;
    if (!matchId) return;
    try {
      if (match?.legs && Array.isArray(match.legs)) {
        setSelectedMatch(match);
        setShowLegsModal(true);
        return;
      }
      const response = await getMatchByIdClientAction({ matchId: String(matchId) });
      setSelectedMatch(
        response && typeof response === "object" && "success" in response && response.success && "match" in response
          ? (response as any).match
          : match
      );
      setShowLegsModal(true);
    } catch (error) {
      console.error("Error loading match details:", error);
      setSelectedMatch(match);
      setShowLegsModal(true);
    }
  };

  const handleCloseLegsModal = () => {
    setShowLegsModal(false);
    setSelectedMatch(null);
  };

  const handleTabChange = (tab: "details" | "stats" | "tickets") => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url);
  };

  const handleDismissTicketToast = () => {
    setTicketToastDismissed(true);
    localStorage.setItem("ticketToastDismissed", "true");
    setTimeout(() => localStorage.removeItem("ticketToastDismissed"), 60 * 60 * 1000);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      toast.success(t("toasts.logout_success"));
    } catch {
      toast.error(t("toasts.logout_error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20 p-4 pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <ProfileHeader />
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {activeTab === "details" && (
          <>
            <CurrentInfoSection user={user} />
            <ProfileEditForm
              defaultValues={{
                email: user.email,
                name: user.name,
                username: user.username,
                country: user.country,
              }}
              isLoading={isLoading}
              onSubmit={onProfileSubmit}
            />
            <GoogleAuthSection email={user.email} />
            {needsEmailVerification && (
              <EmailVerificationSection
                isLoading={isLoading}
                isResending={isResendingCode}
                onVerifySubmit={onVerifySubmit}
                onResendCode={handleResendCode}
              />
            )}
            <ProfileActionsSection isLoading={isLoading} isAdmin={user.isAdmin} onLogout={handleLogout} />
          </>
        )}

        {activeTab === "stats" && (
          <>
            <PlayerStatisticsSection
              playerStats={playerStats}
              isLoading={isLoadingStats}
              onViewLegs={handleViewLegs}
            />
            <LeagueHistorySection
              leagueHistory={leagueHistory}
              isLoading={isLoadingLeagueHistory}
              hasPlayer={playerStats?.hasPlayer || false}
            />
          </>
        )}

        {activeTab === "tickets" &&
          (selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              onBack={() => setSelectedTicket(null)}
              onUpdate={() => {
                refreshUnreadCount();
                loadTickets();
              }}
            />
          ) : (
            <TicketList
              tickets={tickets}
              onSelectTicket={(ticketId) => setSelectedTicket(tickets.find((t) => t.id === ticketId) ?? null)}
              onCreateTicket={() => router.push("/contact")}
            />
          ))}
      </div>

      {!ticketToastDismissed && activeTab !== "tickets" && (
        <UnreadTicketToast unreadCount={unreadCount} onDismiss={handleDismissTicketToast} />
      )}

      {showLegsModal && selectedMatch && (
        <LegsViewModal isOpen={showLegsModal} onClose={handleCloseLegsModal} match={selectedMatch} />
      )}
    </div>
  );
}
