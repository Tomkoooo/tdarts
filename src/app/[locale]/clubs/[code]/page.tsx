"use client"
import { useTranslations } from "next-intl";

import * as React from "react"
import { useRouter } from "@/i18n/routing"
import { useParams, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { showErrorToast, showLocationReviewToast } from "@/lib/toastUtils"
import { getClubAction } from "@/features/clubs/actions/getClub.action"
import { getUserRoleAction } from "@/features/clubs/actions/getUserRole.action"
import { getClubPostsAction } from "@/features/clubs/actions/getClubPosts.action"
import { addMemberAction } from "@/features/clubs/actions/addMember.action"
import { removeMemberAction } from "@/features/clubs/actions/removeMember.action"
import { deactivateClubAction } from "@/features/clubs/actions/deactivateClub.action"
import { checkOacLeagueAction } from "@/features/clubs/actions/checkOacLeague.action"
import { createPlayerAction } from "@/features/players/actions/createPlayer.action"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  deleteTournamentAction,
  getTournamentDeletionInfoAction,
} from "@/features/tournaments/actions/manageTournament.action"

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

  const toClub = React.useCallback((value: unknown): Club | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    if (!('_id' in (value as Record<string, unknown>))) return null
    return value as Club
  }, [])

  // Helper to fetch club data
  const fetchClub = async () => {
    if (!code) {
      setIsClubLoading(false)
      return
    }
    try {
      const clubData = await getClubAction({ clubId: code })
      const parsedClub = toClub(clubData)
      setClub(parsedClub)
    } finally {
      setIsClubLoading(false)
    }
  }

  // Fetch club and role
  React.useEffect(() => {
    const fetchClubAndRole = async () => {
      if (!code) {
        router.push('/myclub')
        return
      }

      try {
        const clubData = await getClubAction({ clubId: code })
        const parsedClub = toClub(clubData)
        if (!parsedClub) {
          throw new Error('Klub betöltése sikertelen')
        }
        setClub(parsedClub)

        // Fetch posts
        try {
          const postsData = await getClubPostsAction({ clubId: parsedClub._id, page: 1, limit: 3 })
          if (postsData && typeof postsData === 'object' && 'posts' in postsData && 'total' in postsData) {
            setPosts((postsData as { posts: any[] }).posts || [])
            setPostsTotal(Number((postsData as { total: number }).total || 0))
          }
        } catch (e) {
          console.error("Failed to fetch posts", e)
        }

        setIsClubLoading(false)

        // Only fetch user role if user is logged in
        if (user?._id) {
          const { role } = await getUserRoleAction({ clubId: code, userId: user._id })
          setUserRole(role)
        } else {
          setUserRole('none')
        }

      } catch (err: any) {

        showErrorToast(err.response?.data?.error || err?.message || 'Klub betöltése sikertelen', {
          error: err?.response?.data?.error || err?.message,
          context: "Klub részletek",
          errorName: "Klub betöltése sikertelen",
        })
        setIsClubLoading(false)
        console.error(err)
        router.push('/myclub')
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
      await removeMemberAction({ clubId: club._id, userId: user._id })
      await fetchClub()
      toast.success(t("sikeresen_kiléptél_a"), { id: toastId })
      router.push('/myclub')
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err?.response?.data?.error || err?.message || 'Kilépés sikertelen', {
        error: err?.response?.data?.error || err?.message,
        context: "Klubból kilépés",
        errorName: "Kilépés sikertelen",
      })
    }
  }

  const handleDeactivateClub = async () => {
    if (!club || !user?._id) return
    const toastId = toast.loading(t("klub_deaktiválása"))
    try {
      await deactivateClubAction({ clubId: club._id })
      await fetchClub()
      toast.success(t("klub_sikeresen_deaktiválva"), { id: toastId })
      router.push('/myclub')
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err?.response?.data?.error || err?.message || 'Klub deaktiválása sikertelen', {
        error: err?.response?.data?.error || err?.message,
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
        const created = await createPlayerAction({ data: { name: player.name } })
        if (created && typeof created === 'object' && 'ok' in created && (created as { ok?: boolean }).ok === false) {
          throw new Error((created as { message?: string }).message || 'Failed to create player')
        }
        if (created && typeof created === 'object' && '_id' in created) {
          playerId = (created as { _id: string })._id
        } else {
          throw new Error('Failed to create player')
        }
      }
      const toastId = toast.loading(t("játékos_hozzáadása"))
      await addMemberAction({ clubId: club._id, userId: playerId })
      await fetchClub()
      toast.success(t("játékos_hozzáadva"), { id: toastId })
    } catch (err: any) {
      showErrorToast(err?.response?.data?.error || err?.message || 'Játékos hozzáadása sikertelen', {
        error: err?.response?.data?.error || err?.message,
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
      const deletionInfo = await getTournamentDeletionInfoAction({ code: tournamentId }) as any
      
      setDeleteTournamentModal({
        isOpen: true,
        tournamentId,
        tournamentName: tournament.tournamentSettings?.name || 'Torna',
        hasPlayers: Boolean(deletionInfo?.hasPlayers),
        playersWithEmailCount: Number(deletionInfo?.playersWithEmailCount || 0),
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
      await deleteTournamentAction({
        code: deleteTournamentModal.tournamentId,
        emailData,
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
      const { oacLeague } = await checkOacLeagueAction({ clubId: club._id })
      if (oacLeague) {
        setOacTournamentConfig({ isOpen: true, leagueId: oacLeague._id })
      } else {
        toast.error(t("oac_liga_nem"))
      }
    } catch (err: any) {
      showErrorToast(err?.response?.data?.error || err?.message || 'OAC liga betöltése sikertelen', {
        error: err?.response?.data?.error || err?.message,
        context: "OAC torna létrehozása",
        errorName: "OAC liga betöltése sikertelen",
      })
    }
  }

  const handleLoadMorePosts = async () => {
    if (!club) return
    const nextPage = postsPage + 1
    try {
      const res = await getClubPostsAction({ clubId: club._id, page: nextPage, limit: 3 })
      if (res && typeof res === 'object' && 'posts' in res && Array.isArray((res as { posts?: unknown[] }).posts)) {
        setPosts([...posts, ...((res as { posts: any[] }).posts || [])])
        setPostsPage(nextPage)
      }
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl">
          <Skeleton className="h-14 w-64 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )

  if (!club) return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="mb-4 text-4xl font-bold">{t("klub_nem_található")}</div>
        <div className="mb-4 text-xl">{t("sajnálom_de_a")}</div>
        <div className="text-xl">{t("kérem_ellenőrizd_a")}</div>
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
