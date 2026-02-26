"use client"
import { useTranslations } from "next-intl";

import * as React from "react"
import { useRouter } from "@/i18n/routing"
import { useParams, useSearchParams } from "next/navigation"
import axios from "axios"
import toast from "react-hot-toast"
import { showErrorToast, showLocationReviewToast } from "@/lib/toastUtils"
import { shouldPromptLocationReview } from "@/interface/location.interface"
import { getMapSettingsTranslations } from "@/data/translations/map-settings"
import { useUserContext } from "@/hooks/useUser"
import { Club } from "@/interface/club.interface"
import ClubLayout from "@/components/club/ClubLayout"
import ClubSummarySection from "@/components/club/ClubSummarySection"
import ClubPlayersSection from "@/components/club/ClubPlayersSection"
import ClubTournamentsSection from "@/components/club/ClubTournamentsSection"
import ClubLeaguesSection from "@/components/club/ClubLeaguesSection"
import ClubSettingsSection from "@/components/club/ClubSettingsSection"
import CreateTournamentModal from "@/components/club/CreateTournamentModal"
import ClubShareModal from "@/components/club/ClubShareModal"
import DeleteTournamentModal from "@/components/club/DeleteTournamentModal"

export default function ClubDetailPage() {
    const t = useTranslations("Club.pages");
  const mt = getMapSettingsTranslations(typeof navigator !== 'undefined' ? navigator.language : 'hu')
  const { user } = useUserContext()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const code = params.code as string
  const locationToastShown = React.useRef(false)

  // State
  const [club, setClub] = React.useState<Club | null>(null)
  const [userRole, setUserRole] = React.useState<'admin' | 'moderator' | 'member' | 'none'>('none')
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = React.useState(false)
  const [defaultIsSandbox, setDefaultIsSandbox] = React.useState(false)
  const [oacTournamentConfig, setOacTournamentConfig] = React.useState<{
    isOpen: boolean
    leagueId: string | null
  }>({ isOpen: false, leagueId: null })
  const [clubShareModal, setClubShareModal] = React.useState(false)
  const [isClubLoading, setIsClubLoading] = React.useState(true)
  const [posts, setPosts] = React.useState<any[]>([])
  const [postsTotal, setPostsTotal] = React.useState(0)
  const [postsPage, setPostsPage] = React.useState(1)
  const [deleteTournamentModal, setDeleteTournamentModal] = React.useState<{
    isOpen: boolean
    tournamentId: string | null
    tournamentName: string
    hasPlayers: boolean
    playersWithEmailCount: number
  }>({
    isOpen: false,
    tournamentId: null,
    tournamentName: '',
    hasPlayers: false,
    playersWithEmailCount: 0,
  })

  // Helper to fetch club data
  const fetchClub = async () => {
    if (!code) {
      setIsClubLoading(false)
      return
    }
    const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`)
        setIsClubLoading(false)
    setClub(clubResponse.data)

  }

  // Fetch club and role
  React.useEffect(() => {
    const fetchClubAndRole = async () => {
      if (!code) {
        router.push('/clubs')
        return
      }

      try {
        const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`)
        setClub(clubResponse.data)
        
        // Fetch posts
        try {
            const postsResponse = await axios.get(`/api/clubs/${clubResponse.data._id}/posts?page=1&limit=3`)
            setPosts(postsResponse.data.posts)
            setPostsTotal(postsResponse.data.total)
        } catch (e) {
            console.error("Failed to fetch posts", e)
        }

        setIsClubLoading(false)

        // Only fetch user role if user is logged in
        if (user?._id) {
          const roleResponse = await axios.get<{ role: 'admin' | 'moderator' | 'member' | 'none' }>(
            `/api/clubs/user/role?clubId=${code}&userId=${user._id}`
          )
          setUserRole(roleResponse.data.role)
        } else {
          setUserRole('none')
        }

      } catch (err: any) {

        showErrorToast(err.response?.data?.error || 'Klub betöltése sikertelen', {
          error: err?.response?.data?.error,
          context: "Klub részletek",
          errorName: "Klub betöltése sikertelen",
        })
        setIsClubLoading(false)
        console.error(err)
        router.push('/clubs')
      }
    }

    fetchClubAndRole()
  }, [code, user, router])

  // Location review prompt for admins/moderators
  React.useEffect(() => {
    const canReviewLocation = userRole === 'admin' || userRole === 'moderator'
    if (!club || !canReviewLocation || locationToastShown.current) return
    if (!shouldPromptLocationReview(club.structuredLocation, club.location || club.address)) return

    locationToastShown.current = true
    showLocationReviewToast(
      mt.locationReviewClubMessage,
      mt.locationReviewAction,
      () => {
        router.push(`/clubs/${code}?page=settings`)
      }
    )
  }, [club, userRole, router, code, mt.locationReviewAction, mt.locationReviewClubMessage])

  // Action handlers
  const handleLeaveClub = async () => {
    if (!club || !user?._id) return
    const toastId = toast.loading(t("kilépés_a_klubból"))
    try {
      await axios.post(`/api/clubs/${club._id}/removeMember`, {
        userId: user._id,
        requesterId: user._id,
      })
      await fetchClub()
      toast.success(t("sikeresen_kiléptél_a"), { id: toastId })
      router.push('/clubs')
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || 'Kilépés sikertelen', {
        error: err?.response?.data?.error,
        context: "Klubból kilépés",
        errorName: "Kilépés sikertelen",
      })
    }
  }

  const handleDeactivateClub = async () => {
    if (!club || !user?._id) return
    const toastId = toast.loading(t("klub_deaktiválása"))
    try {
      await axios.post(`/api/clubs/${club._id}/deactivate`, {
        requesterId: user._id,
      })
      await fetchClub()
      toast.success(t("klub_sikeresen_deaktiválva"), { id: toastId })
      router.push('/clubs')
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || 'Klub deaktiválása sikertelen', {
        error: err?.response?.data?.error,
        context: "Klub deaktiválása",
        errorName: "Deaktiválás sikertelen",
      })
    }
  }

  const handlePlayerSelected = async (player: any) => {
    if (!club || !user?._id) return
    try {
      let playerId = player._id
      // If player is a guest or not in Player collection, create them first
      if (!playerId) {
        const res = await axios.post('/api/players', { name: player.name })
        playerId = res.data._id
      }
      const toastId = toast.loading(t("játékos_hozzáadása"))
      await axios.post(`/api/clubs/${club._id}/addMember`, {
        userId: playerId,
        requesterId: user._id,
      })
      await fetchClub()
      toast.success(t("játékos_hozzáadva"), { id: toastId })
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Játékos hozzáadása sikertelen', {
        error: err?.response?.data?.error,
        context: "Klub tag hozzáadása",
        errorName: "Játékos hozzáadása sikertelen",
      })
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!club || !user?._id) return
    
    // Find tournament to get details
    const tournament = club.tournaments?.find((t: any) => t.tournamentId === tournamentId)
    if (!tournament) return

    // Get tournament deletion info (players with emails count)
    try {
      const deletionInfo = await axios.get(`/api/tournaments/${tournamentId}/deletion-info`)
      
      setDeleteTournamentModal({
        isOpen: true,
        tournamentId,
        tournamentName: tournament.tournamentSettings?.name || 'Torna',
        hasPlayers: deletionInfo.data.hasPlayers,
        playersWithEmailCount: deletionInfo.data.playersWithEmailCount,
      })
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Torna információk betöltése sikertelen', {
        error: err?.response?.data?.error,
        context: "Torna törlése",
        errorName: "Torna információk betöltése sikertelen",
      })
    }
  }

  const handleConfirmDeleteTournament = async (emailData?: { subject: string; message: string }) => {
    if (!deleteTournamentModal.tournamentId || !user?._id) return

    const toastId = toast.loading(t("torna_törlése"))
    try {
      await axios.delete(`/api/tournaments/${deleteTournamentModal.tournamentId}`, {
        data: { emailData }
      })
      await fetchClub()
      toast.success(t("torna_sikeresen_törölve"), { id: toastId })
      setDeleteTournamentModal({
        isOpen: false,
        tournamentId: null,
        tournamentName: '',
        hasPlayers: false,
        playersWithEmailCount: 0,
      })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || 'Torna törlése sikertelen', {
        error: err?.response?.data?.error,
        context: "Torna törlése",
        errorName: "Törlés sikertelen",
      })
    }
  }

  const handleCreateOacTournament = async () => {
    if (!club) return
    try {
      // Fetch the verified OAC league for this club
      const response = await axios.get(`/api/clubs/${club._id}/leagues/check-oac`)
      const oacLeague = response.data.oacLeague
      if (oacLeague) {
        setOacTournamentConfig({ isOpen: true, leagueId: oacLeague._id })
      } else {
        toast.error(t("oac_liga_nem"))
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'OAC liga betöltése sikertelen', {
        error: err?.response?.data?.error,
        context: "OAC torna létrehozása",
        errorName: "OAC liga betöltése sikertelen",
      })
    }
  }

  const handleLoadMorePosts = async () => {
    if (!club) return
    const nextPage = postsPage + 1
    try {
        const res = await axios.get(`/api/clubs/${club._id}/posts?page=${nextPage}&limit=3`)
        setPosts([...posts, ...res.data.posts])
        setPostsPage(nextPage)
    } catch (e) {
        console.error("Failed to load more posts", e)
    }
  }

  // Get default page and league ID from URL
  const getDefaultPage = (): 'summary' | 'players' | 'tournaments' | 'leagues' | 'settings' => {
    const page = searchParams.get('page')
    switch (page) {
      case 'players':
        return 'players'
      case 'tournaments':
        return 'tournaments'
      case 'leagues':
        return 'leagues'
      case 'settings':
        return 'settings'
      default:
        return 'summary'
    }
  }

  const getLeagueIdFromUrl = (): string | null => {
    return searchParams.get('league')
  }

  if (isClubLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold mb-4 flex flex-col">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
        <div className="text-xl mb-4">{t("klub_betöltése_folyamatban")}</div>
      </div>
    </div>
  )

  if (!club) return (
    //club not found section -- use icons and spacing
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold mb-4">{t("klub_nem_található")}</div>
        <div className="text-xl mb-4">{t("sajnálom_de_a")}</div>
        <div className="text-xl mb-4">{t("kérem_ellenőrizd_a")}</div>
      </div>
    </div>
  )

  return (
    <>
      <ClubLayout
        userRole={userRole}
        clubName={club.name}
        landingPage={club.landingPage}
        summary={
          <ClubSummarySection
            club={club}
            code={code}
            user={user}
            onShareClick={() => setClubShareModal(true)}
            aboutText={club.landingPage?.aboutText}
            gallery={club.landingPage?.gallery}
            posts={posts}
            postsTotal={postsTotal}
            onLoadMorePosts={handleLoadMorePosts}
          />
        }
        players={
          <ClubPlayersSection
            club={club}
            userRole={userRole}
            userId={user?._id}
            onClubUpdated={fetchClub}
          />
        }
        tournaments={
          <ClubTournamentsSection
            tournaments={club.tournaments || []}
            userRole={userRole}
            isVerified={club.verified || false}
            onCreateTournament={(isSandbox: boolean) => {
              setDefaultIsSandbox(isSandbox)
              setIsCreateTournamentModalOpen(true)
            }}
            onCreateOacTournament={handleCreateOacTournament}
            onDeleteTournament={handleDeleteTournament}
          />
        }
        leagues={
          <ClubLeaguesSection
            clubId={club._id}
            userRole={userRole}
            autoOpenLeagueId={getLeagueIdFromUrl()}
          />
        }
        settings={
          userRole === 'admin' || userRole === 'moderator' ? (
            <ClubSettingsSection
              club={club}
              userRole={userRole}
              userId={user?._id}
              onCreateTournament={() => {
                setDefaultIsSandbox(false)
                setIsCreateTournamentModalOpen(true)
              }}
              onPlayerSelected={handlePlayerSelected}
              onLeaveClub={handleLeaveClub}
              onDeactivateClub={handleDeactivateClub}
              onClubUpdated={fetchClub}
            />
          ) : undefined
        }
        defaultPage={getDefaultPage()}
      />

      {/* Modals */}
      <CreateTournamentModal
        isOpen={isCreateTournamentModalOpen}
        onClose={() => setIsCreateTournamentModalOpen(false)}
        clubId={club._id}
        userRole={userRole}
        boardCount={0}
        onTournamentCreated={() => fetchClub()}
        defaultIsSandbox={defaultIsSandbox}
      />
      <CreateTournamentModal
        isOpen={oacTournamentConfig.isOpen}
        onClose={() => setOacTournamentConfig({ isOpen: false, leagueId: null })}
        clubId={club._id}
        userRole={userRole}
        boardCount={0}
        preSelectedLeagueId={oacTournamentConfig.leagueId || undefined}
        lockLeagueSelection={true}
        onTournamentCreated={() => {
          fetchClub()
          setOacTournamentConfig({ isOpen: false, leagueId: null })
        }}
      />
      <ClubShareModal
        isOpen={clubShareModal}
        onClose={() => setClubShareModal(false)}
        clubCode={code}
        clubName={club.name}
      />
      <DeleteTournamentModal
        isOpen={deleteTournamentModal.isOpen}
        onClose={() => setDeleteTournamentModal({
          isOpen: false,
          tournamentId: null,
          tournamentName: '',
          hasPlayers: false,
          playersWithEmailCount: 0,
        })}
        onConfirm={handleConfirmDeleteTournament}
        tournamentName={deleteTournamentModal.tournamentName}
        hasPlayers={deleteTournamentModal.hasPlayers}
        playersWithEmailCount={deleteTournamentModal.playersWithEmailCount}
      />
    </>
  )
}
