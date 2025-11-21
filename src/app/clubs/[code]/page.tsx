"use client"

import * as React from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import axios from "axios"
import toast from "react-hot-toast"
import { showErrorToast } from "@/lib/toastUtils"
import { useUserContext } from "@/hooks/useUser"
import { Club } from "@/interface/club.interface"
import ClubLayout from "@/components/club/ClubLayout"
import ClubSummarySection from "@/components/club/ClubSummarySection"
import ClubPlayersSection from "@/components/club/ClubPlayersSection"
import ClubTournamentsSection from "@/components/club/ClubTournamentsSection"
import ClubLeaguesSection from "@/components/club/ClubLeaguesSection"
import ClubSettingsSection from "@/components/club/ClubSettingsSection"
import CreateTournamentModal from "@/components/club/CreateTournamentModal"
import EditClubModal from "@/components/club/EditClubModal"
import ClubShareModal from "@/components/club/ClubShareModal"
import DeleteTournamentModal from "@/components/club/DeleteTournamentModal"

export default function ClubDetailPage() {
  const { user } = useUserContext()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const code = params.code as string

  // State
  const [club, setClub] = React.useState<Club | null>(null)
  const [userRole, setUserRole] = React.useState<'admin' | 'moderator' | 'member' | 'none'>('none')
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = React.useState(false)
  const [isEditClubModalOpen, setIsEditClubModalOpen] = React.useState(false)
  const [clubShareModal, setClubShareModal] = React.useState(false)
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
    if (!code) return
    const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`)
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
        console.error(err)
        router.push('/clubs')
      }
    }

    fetchClubAndRole()
  }, [code, user, router])

  // Action handlers
  const handleLeaveClub = async () => {
    if (!club || !user?._id) return
    const toastId = toast.loading('Kilépés a klubból...')
    try {
      await axios.post(`/api/clubs/${club._id}/removeMember`, {
        userId: user._id,
        requesterId: user._id,
      })
      await fetchClub()
      toast.success('Sikeresen kiléptél a klubból!', { id: toastId })
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
    const toastId = toast.loading('Klub deaktiválása...')
    try {
      await axios.post(`/api/clubs/${club._id}/deactivate`, {
        requesterId: user._id,
      })
      await fetchClub()
      toast.success('Klub sikeresen deaktiválva!', { id: toastId })
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
      const toastId = toast.loading('Játékos hozzáadása...')
      await axios.post(`/api/clubs/${club._id}/addMember`, {
        userId: playerId,
        requesterId: user._id,
      })
      await fetchClub()
      toast.success('Játékos hozzáadva!', { id: toastId })
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

    const toastId = toast.loading('Torna törlése...')
    try {
      await axios.delete(`/api/tournaments/${deleteTournamentModal.tournamentId}`, {
        data: { emailData }
      })
      await fetchClub()
      toast.success('Torna sikeresen törölve!', { id: toastId })
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

  if (!club) return null

  return (
    <>
      <ClubLayout
        userRole={userRole}
        clubName={club.name}
        summary={
          <ClubSummarySection
            club={club}
            code={code}
            user={user}
            onShareClick={() => setClubShareModal(true)}
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
            onCreateTournament={() => setIsCreateTournamentModalOpen(true)}
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
              onEditClub={() => setIsEditClubModalOpen(true)}
              onCreateTournament={() => setIsCreateTournamentModalOpen(true)}
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
      <EditClubModal
        userId={user?._id}
        isOpen={isEditClubModalOpen}
        onClose={() => setIsEditClubModalOpen(false)}
        club={club}
        onClubUpdated={fetchClub}
      />
      <CreateTournamentModal
        isOpen={isCreateTournamentModalOpen}
        onClose={() => setIsCreateTournamentModalOpen(false)}
        clubId={club._id}
        userRole={userRole}
        boardCount={0}
        onTournamentCreated={() => fetchClub()}
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
