"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserContext } from '@/hooks/useUser';
import { Club } from '@/interface/club.interface';
import ClubLayout from '@/components/club/ClubLayout';
import MemberList from '@/components/club/MemberList';
import TournamentList from '@/components/club/TournamentList';
import CreateTournamentModal from '@/components/club/CreateTournamentModal';
import EditClubModal from '@/components/club/EditClubModal';
import PlayerSearch from '@/components/club/PlayerSearch';
import QRCodeModal from '@/components/club/QRCodeModal';
import ClubShareModal from '@/components/club/ClubShareModal';
import LeagueManager from '@/components/club/LeagueManager';
import { IconDoorExit, IconQrcode, IconTrash } from '@tabler/icons-react';


export default function ClubDetailPage() {
  const { user } = useUserContext();
  const [club, setClub] = useState<Club | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member' | 'none'>('none');
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false);
  const [isEditClubModalOpen, setIsEditClubModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;

  const [qrCodeModal, setQrCodeModal] = useState<{ isOpen: boolean; boardNumber: number; boardName?: string }>({
    isOpen: false,
    boardNumber: 0
  });
  const [clubShareModal, setClubShareModal] = useState(false);

  // Get default page from URL parameter
  const getDefaultPage = (): 'summary' | 'players' | 'tournaments' | 'leagues' | 'settings' => {
    const page = searchParams.get('page');
    switch (page) {
      case 'players':
        return 'players';
      case 'tournaments':
        return 'tournaments';
      case 'leagues':
        return 'leagues';
      case 'settings':
        return 'settings';
      default:
        return 'summary';
    }
  };

  // Get league ID from URL parameter for auto-opening
  const getLeagueIdFromUrl = (): string | null => {
    return searchParams.get('league');
  };

  // Helper to fetch club data
  const fetchClub = async () => {
    if (!code) return;
    const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`);
    console.log(clubResponse.data);
    setClub(clubResponse.data);
  };


  useEffect(() => {
    const fetchClubAndRole = async () => {
      if (!code) {
        router.push('/clubs');
        return;
      }

      const toastId = toast.loading('Klub adatok betöltése...');
      try {
        const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`);
        setClub(clubResponse.data);

        // Only fetch user role if user is logged in
        if (user?._id) {
          const roleResponse = await axios.get<{ role: 'admin' | 'moderator' | 'member' | 'none' }>(
            `/api/clubs/user/role?clubId=${code}&userId=${user._id}`
          );
          setUserRole(roleResponse.data.role);
        } else {
          setUserRole('none');
        }

        toast.success('Klub adatok betöltve!', { id: toastId });
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Klub betöltése sikertelen', { id: toastId });
        console.error(err);
        router.push('/clubs');
      }
    };

    fetchClubAndRole();
  }, [code, user, router]);

  const handleLeaveClub = async () => {
    if (!club || !user?._id) return;
    const toastId = toast.loading('Kilépés a klubból...');
    try {
      await axios.post(`/api/clubs/${club._id}/removeMember`, {
        userId: user._id,
        requesterId: user._id,
      });
      await fetchClub();
      toast.success('Sikeresen kiléptél a klubból!', { id: toastId });
      router.push('/clubs');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Kilépés sikertelen', { id: toastId });
    }
  };

  const handleDeactivateClub = async () => {
    if (!club || !user?._id) return;
    const toastId = toast.loading('Klub deaktiválása...');
    try {
      await axios.post(`/api/clubs/${club._id}/deactivate`, {
        requesterId: user._id,
      });
      await fetchClub();
      toast.success('Klub sikeresen deaktiválva!', { id: toastId });
      router.push('/clubs');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Klub deaktiválása sikertelen', { id: toastId });
    }
  };

  // Player add logic for PlayerSearch
  const handlePlayerSelected = async (player: any) => {
    if (!club || !user?._id) return;
    try {
      let playerId = player._id;
      // If player is a guest or not in Player collection, create them first
      if (!playerId) {
        const res = await axios.post('/api/players', { name: player.name });
        playerId = res.data._id;
      }
      const toastId = toast.loading('Játékos hozzáadása...');
      await axios.post(`/api/clubs/${club._id}/addMember`, {
        userId: playerId, // must be userId (player to add)
        requesterId: user._id, // must be requesterId (admin/mod)
      });
      await fetchClub();
      toast.success('Játékos hozzáadva!', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Játékos hozzáadása sikertelen');
    }
  };

  if (!club) return null;

  // Calculate summary stats
  const numPlayers = club.members.length;

  const tournaments = club.tournaments || [];
  const pastTournaments = tournaments.filter(t => t.tournamentSettings?.status === 'finished').length;
  const ongoingTournaments = tournaments.filter(t => 
    t.tournamentSettings?.status === 'group-stage' || t.tournamentSettings?.status === 'knockout'
  ).length;
  const upcomingTournaments = tournaments.filter(t => t.tournamentSettings?.status === 'pending').length;
  
  // Calculate total players across all tournaments
  const totalTournamentPlayers = tournaments.reduce((total, tournament) => {
    return total + (tournament.tournamentPlayers?.length || 0);
  }, 0);

  // Summary section
  const summarySection = (
    <div className="space-y-4 md:space-y-6">
      <section className="bg-base-200 rounded-2xl shadow-xl p-4 md:p-6 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-1">{club.name}</h2>
            <div className="text-base md:text-lg text-base-content/80 mb-2">{club.description}</div>
            <div className="flex flex-wrap gap-2 md:gap-4 items-center text-sm md:text-base text-base-content/60">
              <span>Helyszín: <span className="font-medium text-base-content">{club.location}</span></span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {user ? (
              <>
                <button
                  onClick={() => setClubShareModal(true)}
                  className="btn btn-xs sm:btn-sm btn-outline btn-primary flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center"
                  title="QR kód megjelenítése"
                >
                  <IconQrcode className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Megosztás</span>
                </button>
                <button
                  onClick={() => {
                    const loginLink = `${window.location.origin}/auth/login?redirect=${encodeURIComponent(`/clubs/${code}?page=tournaments`)}`;
                    navigator.clipboard.writeText(loginLink);
                    toast.success('Bejelentkezési link másolva!');
                  }}
                  className="btn btn-xs sm:btn-sm btn-outline btn-secondary text-white flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center"
                  title="Bejelentkezési link másolása"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs sm:text-sm">Link másolása</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setClubShareModal(true)}
                  className="btn btn-xs sm:btn-sm btn-outline btn-primary flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center"
                  title="QR kód megjelenítése"
                >
                  <IconQrcode className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Megosztás</span>
                </button>
                <a
                  href={`/auth/login?redirect=${encodeURIComponent(`/clubs/${code}?page=tournaments`)}`}
                  className="btn btn-xs sm:btn-sm btn-primary flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xs sm:text-sm">Bejelentkezés</span>
                </a>
              </>
            )}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-base-200 rounded-xl p-4 md:p-6 flex flex-col items-center">
          <span className="text-3xl md:text-4xl font-bold text-primary">{numPlayers}</span>
          <span className="text-sm md:text-base text-base-content/70 mt-1 md:mt-2">Játékos</span>
        </div>
        <div className="bg-base-200 rounded-xl p-4 md:p-6 flex flex-col items-center">
          <span className="text-3xl md:text-4xl font-bold text-accent">{pastTournaments}</span>
          <span className="text-sm md:text-base text-base-content/70 mt-1 md:mt-2">Befejezett verseny</span>
        </div>
        <div className="bg-base-200 rounded-xl p-4 md:p-6 flex flex-col items-center">
          <span className="text-3xl md:text-4xl font-bold text-success">{ongoingTournaments + upcomingTournaments}</span>
          <span className="text-sm md:text-base text-base-content/70 mt-1 md:mt-2">Aktív vagy közelgő verseny</span>
        </div>
        <div className="bg-base-200 rounded-xl p-4 md:p-6 flex flex-col items-center">
          <span className="text-3xl md:text-4xl font-bold text-warning">{totalTournamentPlayers}</span>
          <span className="text-sm md:text-base text-base-content/70 mt-1 md:mt-2">Összes versenyző</span>
        </div>
      </div>
    </div>
  );

  // Players section
  const playersSection = (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">Játékosok</h2>
      <MemberList
        club={club}
        members={club.members as { _id: string; userRef?: string, role: 'admin' | 'moderator' | 'member'; name: string; username: string }[]}
        userRole={userRole}
        userId={user?._id}
        clubId={club._id}
        onAddMember={() => {}}
        onClubUpdated={fetchClub}
        showActions={false}
      />
    </div>
  );

  // Tournaments section
  const tournamentsSection: React.ReactNode = (
    <div className="space-y-4">
      {(userRole === 'admin' || userRole === 'moderator') && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-primary">Versenyek</h2>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreateTournamentModalOpen(true)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Új verseny
          </button>
        </div>
      )}
      <TournamentList
        tournaments={(club.tournaments || [])}
        userRole={userRole}
      />
    </div>
  );

  // Leagues section
  const leaguesSection = (
    <LeagueManager
      clubId={club._id}
      userRole={userRole}
      autoOpenLeagueId={getLeagueIdFromUrl()}
    />
  );

  // Settings section (admin only)
  const settingsSection = userRole === 'admin' || userRole === 'moderator' ? (
    <div className="space-y-4 md:space-y-6">
      <div className="card-section">
        <div className="section-header">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span className="text-lg md:text-xl">Klub adatok szerkesztése</span>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn btn-primary btn-xs flex-1" onClick={() => setIsEditClubModalOpen(true)}>
              Klub szerkesztése
            </button>
            <button className="btn btn-primary btn-xs flex-1" onClick={() => setIsCreateTournamentModalOpen(true)}>
              Új verseny indítása
            </button>
          </div>
        </div>
      </div>
      <div className="card-section">
        <div className="section-header">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 01.88 7.75M8 3.13a4 4 0 00-.88 7.75" /></svg>
          <span className="text-lg md:text-xl">Tagok kezelése</span>
        </div>
        <div className="space-y-4">
          <PlayerSearch
            onPlayerSelected={handlePlayerSelected}
            placeholder="Játékos keresése vagy hozzáadása..."
            userRole={userRole}
          />
          <MemberList
            club={club}
            members={club.members as { _id: string; userRef?: string, role: 'admin' | 'moderator' | 'member'; name: string; username: string }[]}
            userRole={userRole}
            userId={user?._id}
            clubId={club._id}
            onAddMember={() => setIsAddPlayerModalOpen(true)}
            onClubUpdated={fetchClub}
            showActions={true}
          />
        </div>
      </div>
      <div className="card-section">
        <div className="section-header">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
          <span className="text-lg md:text-xl">Táblák kezelése</span>
        </div>
        <div className="space-y-4">
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>A táblák mostantól a tornáknál kerülnek létrehozásra és kezelésre. Hozz létre egy új tornát, és ott add meg a táblákat!</span>
          </div>
        </div>
      </div>
      
      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrCodeModal.isOpen}
        onClose={() => setQrCodeModal({ isOpen: false, boardNumber: 0 })}
        clubId={club._id}
        boardNumber={qrCodeModal.boardNumber}
        boardName={qrCodeModal.boardName}
      />
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          {userRole === 'admin' && (
            <button
              className="btn btn-primary btn-outline btn-xs flex items-center gap-2 w-full sm:w-auto"
              onClick={handleDeactivateClub}
            >
              <IconTrash size={20}/>
              <span className="ml-1">Klub Deaktiválása</span>
            </button>
          )}

          <button
            className="btn btn-primary btn-outline btn-xs flex items-center gap-2 w-full sm:w-auto"
            onClick={handleLeaveClub}
          >
            <IconDoorExit size={20}/>
            <span className="ml-1">Kilépés a klubból</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <ClubLayout
        userRole={userRole}
        clubId={club._id}
        clubName={club.name}
        summary={summarySection}
        players={playersSection}
        tournaments={tournamentsSection}
        leagues={leaguesSection}
        settings={settingsSection}
        defaultPage={getDefaultPage()}
      >
        <p>test</p>
      </ClubLayout>
      
      {/* Modals - outside sections so they're always accessible */}
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
    </>
  );
}