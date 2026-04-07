"use client"

import { useTranslations } from "next-intl";
import * as React from "react"
import { useRouter } from "@/i18n/routing"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { showErrorToast, showLocationReviewToast } from "@/lib/toastUtils"
import { getClubAction } from "@/features/clubs/actions/getClub.action"
import { getUserRoleAction } from "@/features/clubs/actions/getUserRole.action"
import { getClubPostsAction } from "@/features/clubs/actions/getClubPosts.action"
import { getClubMembersAction } from "@/features/clubs/actions/getClubMembers.action"
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
import {
  deleteTournamentAction,
  getTournamentDeletionInfoAction,
} from "@/features/tournaments/actions/manageTournament.action"

type UserRole = "admin" | "moderator" | "member" | "none";
export type ClubInitialDataLevel = "summary" | "full";

type ClubDetailClientPageProps = {
  code: string;
  initialClub: Club | null;
  initialUserRole: UserRole;
  initialPosts: any[];
  initialPostsTotal: number;
  defaultPage: "summary" | "players" | "tournaments" | "leagues" | "settings";
  initialLeagueId: string | null;
  initialDetailLevel: ClubInitialDataLevel;
  initialSelectedTournamentIds?: string[];
  invalidShareToken?: boolean;
};

export default function ClubDetailClientPage({
  code,
  initialClub,
  initialUserRole,
  initialPosts,
  initialPostsTotal,
  defaultPage,
  initialLeagueId,
  initialDetailLevel,
  initialSelectedTournamentIds = [],
  invalidShareToken = false,
}: ClubDetailClientPageProps) {
  const t = useTranslations("Club.pages");
  const mt = getMapSettingsTranslations(typeof navigator !== "undefined" ? navigator.language : "hu")
  const { user } = useUserContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locationToastShown = React.useRef(false)
  const requestIdRef = React.useRef(`club-client-${code}-${Math.random().toString(36).slice(2, 8)}`)

  const [club, setClub] = React.useState<Club | null>(initialClub)
  const [userRole, setUserRole] = React.useState<UserRole>(initialUserRole)
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = React.useState(false)
  const [defaultIsSandbox, setDefaultIsSandbox] = React.useState(false)
  const [oacTournamentConfig, setOacTournamentConfig] = React.useState<{ isOpen: boolean; leagueId: string | null }>({
    isOpen: false,
    leagueId: null,
  })
  const [clubShareModal, setClubShareModal] = React.useState(false)
  const [posts, setPosts] = React.useState<any[]>(initialPosts)
  const [postsTotal, setPostsTotal] = React.useState(initialPostsTotal)
  const [postsPage, setPostsPage] = React.useState(1)
  const [membersLoaded, setMembersLoaded] = React.useState(Array.isArray(initialClub?.members) && initialClub!.members.length > 0)
  const [membersLoading, setMembersLoading] = React.useState(false)
  const [deleteTournamentModal, setDeleteTournamentModal] = React.useState<{
    isOpen: boolean
    tournamentId: string | null
    tournamentName: string
    hasPlayers: boolean
    playersWithEmailCount: number
  }>({
    isOpen: false,
    tournamentId: null,
    tournamentName: "",
    hasPlayers: false,
    playersWithEmailCount: 0,
  })

  const toClub = React.useCallback((value: unknown): Club | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    if (!("_id" in (value as Record<string, unknown>))) return null
    return value as Club
  }, [])

  const fetchClub = React.useCallback(async () => {
    if (!code) return
    const clubData = await getClubAction({ clubId: code, detailLevel: "summary" })
    const parsedClub = toClub(clubData)
    if (parsedClub) {
      setClub(parsedClub)
    }
  }, [code, toClub])

  const refreshMembers = React.useCallback(
    async (clubId: string) => {
      if (!clubId) return
      setMembersLoading(true)
      try {
        const membersData = (await getClubMembersAction({
          clubId,
          requestId: requestIdRef.current,
        })) as any
        if (membersData && typeof membersData === "object" && Array.isArray(membersData.members)) {
          setClub((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              members: membersData.members,
              admin: Array.isArray(membersData.admin) ? membersData.admin : prev.admin,
              moderators: Array.isArray(membersData.moderators) ? membersData.moderators : prev.moderators,
              membersCount: typeof membersData.membersCount === "number" ? membersData.membersCount : prev.membersCount,
            } as Club
          })
          setMembersLoaded(true)
        }
      } catch (error) {
        console.error("Failed to refresh club members", error)
      } finally {
        setMembersLoading(false)
      }
    },
    []
  )

  React.useEffect(() => {
    const syncRole = async () => {
      if (!code || !user?._id) return
      const { role } = await getUserRoleAction({
        clubId: code,
        userId: user._id,
        requestId: requestIdRef.current,
      })
      setUserRole(role)
    }
    void syncRole()
  }, [code, user?._id])

  React.useEffect(() => {
    const page = searchParams.get("page")
    const needsMembers = page === "players" || page === "settings"
    if (!needsMembers || membersLoaded || membersLoading || !club?._id) return

    void refreshMembers(club._id)
  }, [club?._id, membersLoaded, membersLoading, searchParams, refreshMembers])

  React.useEffect(() => {
    const loadInitialPosts = async () => {
      if (!club?._id) return
      if (postsPage > 1 || posts.length > 0) return
      try {
        const res = await getClubPostsAction({
          clubId: club._id,
          page: 1,
          limit: 3,
          requestId: requestIdRef.current,
        })
        if (res && typeof res === "object" && "posts" in res && "total" in res) {
          setPosts((res as { posts?: any[] }).posts || [])
          setPostsTotal(Number((res as { total?: number }).total || 0))
        }
      } catch (error) {
        console.error("Failed to load initial posts", error)
      }
    }
    void loadInitialPosts()
  }, [club?._id, posts.length, postsPage])

  React.useEffect(() => {
    const canReviewLocation = userRole === "admin" || userRole === "moderator"
    if (!club || !canReviewLocation || locationToastShown.current) return
    if (!shouldPromptLocationReview(club.structuredLocation, club.location || club.address)) return

    locationToastShown.current = true
    showLocationReviewToast(mt.locationReviewClubMessage, mt.locationReviewAction, () => {
      router.push(`/clubs/${code}?page=settings`)
    })
  }, [club, userRole, router, code, mt.locationReviewAction, mt.locationReviewClubMessage])

  const handleLeaveClub = async () => {
    if (!club || !user?._id) return
    const toastId = toast.loading(t("kilépés_a_klubból"))
    try {
      await removeMemberAction({ clubId: club._id, userId: user._id })
      await fetchClub()
      toast.success(t("sikeresen_kiléptél_a"), { id: toastId })
      router.push("/myclub")
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err?.response?.data?.error || err?.message || "Kilépés sikertelen", {
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
      router.push("/myclub")
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err?.response?.data?.error || err?.message || "Klub deaktiválása sikertelen", {
        error: err?.response?.data?.error || err?.message,
        context: "Klub deaktiválása",
        errorName: "Deaktiválás sikertelen",
      })
    }
  }

  const handlePlayerSelected = async (player: any) => {
    if (!club || !user?._id) return
    const toastId = toast.loading(t("játékos_hozzáadása"))
    try {
      let playerId = player._id
      if (!playerId) {
        const created = await createPlayerAction({ data: { name: player.name } })
        if (created && typeof created === "object" && "ok" in created && (created as { ok?: boolean }).ok === false) {
          throw new Error((created as { message?: string }).message || "Failed to create player")
        }
        if (created && typeof created === "object" && "_id" in created) {
          playerId = (created as { _id: string })._id
        } else {
          throw new Error("Failed to create player")
        }
      }
      await addMemberAction({ clubId: club._id, userId: playerId })
      await fetchClub()
      await refreshMembers(club._id)
      toast.success(t("játékos_hozzáadva"), { id: toastId })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err?.response?.data?.error || err?.message || "Játékos hozzáadása sikertelen", {
        error: err?.response?.data?.error || err?.message,
        context: "Klub tag hozzáadása",
        errorName: "Játékos hozzáadása sikertelen",
      })
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!club || !user?._id) return
    const tournament = club.tournaments?.find((t: any) => t.tournamentId === tournamentId)
    if (!tournament) return
    try {
      const deletionInfo = await getTournamentDeletionInfoAction({ code: tournamentId }) as any
      setDeleteTournamentModal({
        isOpen: true,
        tournamentId,
        tournamentName: tournament.tournamentSettings?.name || "Torna",
        hasPlayers: Boolean(deletionInfo?.hasPlayers),
        playersWithEmailCount: Number(deletionInfo?.playersWithEmailCount || 0),
      })
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Torna információk betöltése sikertelen", {
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
      await deleteTournamentAction({ code: deleteTournamentModal.tournamentId, emailData })
      await fetchClub()
      toast.success(t("torna_sikeresen_törölve"), { id: toastId })
      setDeleteTournamentModal({
        isOpen: false,
        tournamentId: null,
        tournamentName: "",
        hasPlayers: false,
        playersWithEmailCount: 0,
      })
    } catch (err: any) {
      toast.dismiss(toastId)
      showErrorToast(err.response?.data?.error || "Torna törlése sikertelen", {
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
      showErrorToast(err?.response?.data?.error || err?.message || "OAC liga betöltése sikertelen", {
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
      const res = await getClubPostsAction({
        clubId: club._id,
        page: nextPage,
        limit: 3,
        requestId: requestIdRef.current,
      })
      if (res && typeof res === "object" && "posts" in res && Array.isArray((res as { posts?: unknown[] }).posts)) {
        setPosts((prev) => [...prev, ...((res as { posts: any[] }).posts || [])])
        setPostsPage(nextPage)
      }
    } catch (e) {
      console.error("Failed to load more posts", e)
    }
  }

  if (!club) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="mb-4 text-4xl font-bold">{t("klub_nem_található")}</div>
          <div className="mb-4 text-xl">{t("sajnálom_de_a")}</div>
          <div className="text-xl">{t("kérem_ellenőrizd_a")}</div>
        </div>
      </div>
    )
  }

  const pageParam = searchParams.get("page")
  const effectiveDefaultPage = (pageParam === "players" || pageParam === "tournaments" || pageParam === "leagues" || pageParam === "settings")
    ? pageParam
    : defaultPage

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
            onClubUpdated={async () => {
              await fetchClub()
              await refreshMembers(club._id)
            }}
            membersLoading={membersLoading && !membersLoaded}
          />
        }
        tournaments={
          <ClubTournamentsSection
            tournaments={club.tournaments || []}
            preselectedTournamentIds={initialSelectedTournamentIds}
            invalidShareToken={invalidShareToken}
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
            autoOpenLeagueId={searchParams.get("league") || initialLeagueId}
          />
        }
        settings={
          userRole === "admin" || userRole === "moderator" ? (
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
              onClubUpdated={async () => {
                await fetchClub()
                await refreshMembers(club._id)
              }}
              membersLoading={membersLoading && !membersLoaded}
            />
          ) : undefined
        }
        defaultPage={effectiveDefaultPage}
      />

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
          void fetchClub()
          setOacTournamentConfig({ isOpen: false, leagueId: null })
        }}
      />
      <ClubShareModal
        isOpen={clubShareModal}
        onClose={() => setClubShareModal(false)}
        clubCode={code}
        clubId={club._id}
        clubName={club.name}
        tournaments={club.tournaments || []}
      />
      <DeleteTournamentModal
        isOpen={deleteTournamentModal.isOpen}
        onClose={() => setDeleteTournamentModal({
          isOpen: false,
          tournamentId: null,
          tournamentName: "",
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
