"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import axios from "axios"
import { useUserContext } from "@/hooks/useUser"
import ProfileHeader from "@/components/profile/ProfileHeader"
import ProfileTabs from "@/components/profile/ProfileTabs"
import CurrentInfoSection from "@/components/profile/CurrentInfoSection"
import ProfileEditForm from "@/components/profile/ProfileEditForm"
import EmailVerificationSection from "@/components/profile/EmailVerificationSection"
import PlayerStatisticsSection from "@/components/profile/PlayerStatisticsSection"
import LeagueHistorySection from "@/components/profile/LeagueHistorySection"
import ProfileActionsSection from "@/components/profile/ProfileActionsSection"
import TicketList from "@/components/profile/TicketList"
import TicketDetail from "@/components/profile/TicketDetail"
import LegsViewModal from "@/components/tournament/LegsViewModal"
import { LoadingScreen } from "@/components/ui/loading-spinner"
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets"
import { useTranslations } from 'next-intl'
import GoogleAuthSection from "@/components/profile/GoogleAuthSection"
import { useLogout } from "@/hooks/useLogout"

export default function ProfilePage() {
  const t = useTranslations("Profile")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, setUser } = useUserContext()
  const userId = user?._id
  const { logout } = useLogout()

  // State
  const [activeTab, setActiveTab] = React.useState<'details' | 'stats' | 'tickets'>('details')
  const [isLoading, setIsLoading] = React.useState(false)
  const [needsEmailVerification, setNeedsEmailVerification] = React.useState(false)
  const [playerStats, setPlayerStats] = React.useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = React.useState(false)
  const [isResendingCode, setIsResendingCode] = React.useState(false)
  const [showLegsModal, setShowLegsModal] = React.useState(false)
  const [selectedMatch, setSelectedMatch] = React.useState<any>(null)
  const [leagueHistory, setLeagueHistory] = React.useState<any[]>([])
  const [isLoadingLeagueHistory, setIsLoadingLeagueHistory] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null)
  const [tickets, setTickets] = React.useState<any[]>([])
  const [ticketToastDismissed, setTicketToastDismissed] = React.useState(false)
  const { unreadCount, refresh: refreshUnreadCount } = useUnreadTickets({ enabled: Boolean(userId) })

  // Initialize tab from URL params
  React.useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'stats' || tab === 'tickets' || tab === 'details') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Check for dismissed ticket toast
  React.useEffect(() => {
    const dismissed = localStorage.getItem('ticketToastDismissed');
    if (dismissed) {
      setTicketToastDismissed(true);
    }
  }, []);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!userId) {
      router.replace(`/auth/login?redirect=${encodeURIComponent("/profile")}`)
      return
    }
    setNeedsEmailVerification(!user?.isVerified)
    loadPlayerStats()
    loadLeagueHistory()
    loadTickets()
  }, [router, user?.isVerified, userId])

  // Load player stats
  const loadPlayerStats = async () => {
    setIsLoadingStats(true)
    try {
      const response = await axios.get('/api/profile/player-stats')
      if (response.data.success) {
        setPlayerStats(response.data.data)
      }
    } catch (error) {
      console.error('Error loading player stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Load tickets
  const loadTickets = async () => {
    try {
      const response = await axios.get('/api/profile/tickets')
      if (response.data.success) {
        setTickets(response.data.data)
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
    }
  }

  // Load league history
  const loadLeagueHistory = async () => {
    setIsLoadingLeagueHistory(true)
    try {
      const response = await axios.get('/api/profile/league-history')
      if (response.data.success) {
        setLeagueHistory(response.data.data)
      }
    } catch (error) {
      console.error('Error loading league history:', error)
    } finally {
      setIsLoadingLeagueHistory(false)
    }
  }

  // Handle profile update
  const onProfileSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      // Only include password if it's provided and not empty
      const updateData: any = {
        email: data.email,
        name: data.name,
        username: data.username,
        country: data.country,
      }

      if (data.password && data.password.trim().length > 0) {
        updateData.password = data.password
      }

      await toast.promise(
        axios.post("/api/profile/update", updateData, {
          headers: { "Content-Type": "application/json" },
        }),
        {
          loading: t("toasts.updating"),
          success: () => {
            setUser({
              ...user!,
              email: data.email || user!.email,
              name: data.name || user!.name,
              username: data.username || user!.username,
              country: data.country || user!.country,
              isVerified: data.email && data.email !== user!.email ? false : user!.isVerified,
            })
            setNeedsEmailVerification(data.email !== user!.email && !!data.email)
            return t("toasts.update_success")
          },
          error: (error) => error.response?.data.error || t("toasts.update_error"),
        }
      )
    } catch (error) {
      console.error("Update profile error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle email verification
  const onVerifySubmit = async (data: { code: string }) => {
    setIsLoading(true)
    try {
      const response = await axios.post("/api/profile/verify-email", data, {
        headers: { "Content-Type": "application/json" },
      })
      if (response.data.success) {
        setUser({ ...user!, isVerified: true })
        setNeedsEmailVerification(false)
        toast.success(t("toasts.verification_success"))
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("toasts.verification_error"))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle resend verification code
  const handleResendCode = async () => {
    setIsResendingCode(true)
    try {
      await axios.post("/api/profile/resend-verification")
      toast.success(t("toasts.resend_success"))
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("toasts.resend_error"))
    } finally {
      setIsResendingCode(false)
    }
  }

  // Handle view legs
  const handleViewLegs = async (match: any) => {
    const matchId = match?._id
    if (!matchId) return

    try {
      if (match?.legs && Array.isArray(match.legs)) {
        setSelectedMatch(match)
        setShowLegsModal(true)
        return
      }

      const response = await axios.get(`/api/matches/${matchId}`)
      if (response.data?.success && response.data?.match) {
        setSelectedMatch(response.data.match)
      } else {
        setSelectedMatch(match)
      }
      setShowLegsModal(true)
    } catch (error) {
      console.error("Error loading match details:", error)
      setSelectedMatch(match)
      setShowLegsModal(true)
    }
  }

  // Handle close legs modal
  const handleCloseLegsModal = () => {
    setShowLegsModal(false)
    setSelectedMatch(null)
  }

  // Handle tab change
  const handleTabChange = (tab: 'details' | 'stats' | 'tickets') => {
    setActiveTab(tab)
    // Update URL without triggering navigation
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.pushState({}, '', url)
  }

  const handleDismissTicketToast = () => {
    setTicketToastDismissed(true);
    localStorage.setItem('ticketToastDismissed', 'true');
    // Clear after 1 hour so it can reappear
    setTimeout(() => {
      localStorage.removeItem('ticketToastDismissed');
    }, 60 * 60 * 1000);
  };

  // Handle logout
  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logout()
      toast.success(t("toasts.logout_success"))
    } catch {
      toast.error(t("toasts.logout_error"))
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingScreen text={t("loading_data")} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <ProfileHeader />

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Details Tab */}
        {activeTab === 'details' && (
          <>
            {/* Current Information */}
            <CurrentInfoSection user={user} />

            {/* Edit Profile Form */}
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

            {/* Email Verification */}
            {needsEmailVerification && (
              <EmailVerificationSection
                isLoading={isLoading}
                isResending={isResendingCode}
                onVerifySubmit={onVerifySubmit}
                onResendCode={handleResendCode}
              />
            )}

            {/* Actions */}
            <ProfileActionsSection
              isLoading={isLoading}
              isAdmin={user.isAdmin}
              onLogout={handleLogout}
            />
          </>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <>
            {/* Player Statistics */}
            <PlayerStatisticsSection
              playerStats={playerStats}
              isLoading={isLoadingStats}
              onViewLegs={handleViewLegs}
            />

            {/* League History */}
            <LeagueHistorySection
              leagueHistory={leagueHistory}
              isLoading={isLoadingLeagueHistory}
              hasPlayer={playerStats?.hasPlayer || false}
            />
          </>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          selectedTicket ? (
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
              onSelectTicket={(ticketId) => {
                const ticket = tickets.find(t => t.id === ticketId)
                setSelectedTicket(ticket)
              }}
              onCreateTicket={() => router.push('/contact')}
            />
          )
        )}
      </div>

      {/* Unread Ticket Toast */}
      {!ticketToastDismissed && activeTab !== 'tickets' && (
        <UnreadTicketToast 
          unreadCount={unreadCount} 
          onDismiss={handleDismissTicketToast}
        />
      )}

      {/* Legs Modal */}
      {showLegsModal && selectedMatch && (
        <LegsViewModal
          isOpen={showLegsModal}
          onClose={handleCloseLegsModal}
          match={selectedMatch}
        />
      )}
    </div>
  )
}
