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
import { IconQrcode } from '@tabler/icons-react';


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

  // Board management state
  const [boardEdit, setBoardEdit] = useState<{ boardNumber: number; name: string } | null>(null);
  const [boardAddOpen, setBoardAddOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [qrCodeModal, setQrCodeModal] = useState<{ isOpen: boolean; boardNumber: number; boardName?: string }>({
    isOpen: false,
    boardNumber: 0
  });
  const [clubShareModal, setClubShareModal] = useState(false);

  // Get default page from URL parameter
  const getDefaultPage = (): 'summary' | 'players' | 'tournaments' | 'settings' => {
    const page = searchParams.get('page');
    switch (page) {
      case 'players':
        return 'players';
      case 'tournaments':
        return 'tournaments';
      case 'settings':
        return 'settings';
      default:
        return 'summary';
    }
  };

  // Helper to fetch club data
  const fetchClub = async () => {
    if (!code) return;
    const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`);
    setClub(clubResponse.data);
  };

  // Board handlers
  const handleAddBoard = async () => {
    if (!club || !user?._id) return;
    try {
      const toastId = toast.loading('Tábla hozzáadása...');
      await axios.post(`/api/clubs/${club._id}/addBoard`, {
        userId: user._id,
        name: newBoardName,
      });
      await fetchClub();
      setBoardAddOpen(false);
      setNewBoardName('');
      toast.success('Tábla hozzáadva!', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tábla hozzáadása sikertelen');
    }
  };

  const handleEditBoard = async () => {
    if (!club || !user?._id || !boardEdit) return;
    try {
      const toastId = toast.loading('Tábla szerkesztése...');
      await axios.post(`/api/clubs/${club._id}/editBoard`, {
        userId: user._id,
        boardNumber: boardEdit.boardNumber,
        name: boardEdit.name,
      });
      await fetchClub();
      setBoardEdit(null);
      toast.success('Tábla módosítva!', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tábla szerkesztése sikertelen');
    }
  };

  const handleRemoveBoard = async (boardNumber: number) => {
    if (!club || !user?._id) return;
    if (!window.confirm('Biztosan törlöd ezt a táblát?')) return;
    try {
      const toastId = toast.loading('Tábla törlése...');
      await axios.post(`/api/clubs/${club._id}/removeBoard`, {
        userId: user._id,
        boardNumber,
      });
      await fetchClub();
      toast.success('Tábla törölve!', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tábla törlése sikertelen');
    }
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
  const pastTournaments = tournaments.filter(t => t.status === 'finished').length;
  const ongoingTournaments = tournaments.filter(t => t.status === 'active').length;
  const upcomingTournaments = tournaments.filter(t => t.status === 'pending').length;

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
        <div className="bg-base-200 rounded-xl p-4 md:p-6 flex flex-col items-center sm:col-span-2 md:col-span-1">
          <span className="text-3xl md:text-4xl font-bold text-success">{ongoingTournaments + upcomingTournaments}</span>
          <span className="text-sm md:text-base text-base-content/70 mt-1 md:mt-2">Aktív vagy közelgő verseny</span>
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
      <div className="mb-4">
      </div>
      <TournamentList
        tournaments={(club.tournaments || []).map((t: any) => ({
          ...t,
          userRole,
          tournamentId: t.tournamentId,
          status: t.status as 'finished' | 'active' | 'pending',
          startDate: t.startDate,
        }))}
        userRole={userRole}
      />
    </div>
  );

  // Settings section (admin only)
  const settingsSection = userRole === 'admin' || userRole === 'moderator' ? (
    <div className="space-y-4 md:space-y-6">
      <div className="card-section">
        <div className="section-header">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span className="text-lg md:text-xl">Klub adatok szerkesztése</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="btn btn-primary btn-sm md:btn-md flex-1" onClick={() => setIsEditClubModalOpen(true)}>
            Klub szerkesztése
          </button>
          <button className="btn btn-primary btn-sm md:btn-md flex-1" onClick={() => setIsCreateTournamentModalOpen(true)}>
            Új verseny indítása
          </button>
        </div>
      </div>
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
        boardCount={club.boards?.length || 0}
        onTournamentCreated={() => fetchClub()}
      />
      <div className="card-section">
        <div className="section-header">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 01.88 7.75M8 3.13a4 4 0 00-.88 7.75" /></svg>
          <span className="text-lg md:text-xl">Tagok kezelése</span>
        </div>
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
      <div className="card-section">
        <div className="section-header">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
          <span className="text-lg md:text-xl">Táblák kezelése</span>
        </div>
        <div className="mb-3 text-sm md:text-base text-base-content/70">Összesen {club.boards?.length || 0} tábla</div>
        <ul className="space-y-2 mb-4">
          {club.boards && club.boards.length > 0 ? (
            club.boards.map((board: any) => (
              <li key={board.boardNumber} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-base-200 rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-semibold text-sm md:text-base">#{board.boardNumber}</span>
                  {board.name && <span className="text-xs md:text-sm text-base-content/60">{board.name}</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button 
                    className="btn btn-xs btn-primary" 
                    onClick={() => setQrCodeModal({ 
                      isOpen: true, 
                      boardNumber: board.boardNumber, 
                      boardName: board.name 
                    })}
                    title="QR Kód megjelenítése"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>
                  <button className="btn btn-xs btn-outline" onClick={() => setBoardEdit({ boardNumber: board.boardNumber, name: board.name || '' })}>
                    <span className="hidden sm:inline">Szerkesztés</span>
                    <span className="sm:hidden">Szerk</span>
                  </button>
                  <button className="btn btn-xs btn-error" onClick={() => handleRemoveBoard(board.boardNumber)}>
                    <span className="hidden sm:inline">Törlés</span>
                    <span className="sm:hidden">Töröl</span>
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-sm md:text-base text-base-content/60 p-3 bg-base-200 rounded-lg">Nincsenek táblák.</li>
          )}
        </ul>
        <button className="btn btn-sm md:btn-md btn-primary w-full sm:w-auto" onClick={() => setBoardAddOpen(true)}>
          <span className="hidden sm:inline">Új tábla hozzáadása</span>
          <span className="sm:hidden">Új tábla</span>
        </button>
        {/* Add Board Modal */}
        {boardAddOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-base-200 rounded-xl p-4 md:p-6 shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-bold mb-3">Új tábla hozzáadása</h3>
              <input
                type="text"
                className="input input-bordered w-full mb-4"
                placeholder="Tábla neve (opcionális)"
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost btn-sm" onClick={() => setBoardAddOpen(false)}>Mégse</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddBoard}>Hozzáadás</button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Board Modal */}
        {boardEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-base-200 rounded-xl p-4 md:p-6 shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-bold mb-3">Tábla szerkesztése</h3>
              <input
                type="text"
                className="input input-bordered w-full mb-4"
                placeholder="Tábla neve"
                value={boardEdit.name}
                onChange={e => setBoardEdit({ ...boardEdit, name: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost btn-sm" onClick={() => setBoardEdit(null)}>Mégse</button>
                <button className="btn btn-primary btn-sm" onClick={handleEditBoard}>Mentés</button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrCodeModal.isOpen}
        onClose={() => setQrCodeModal({ isOpen: false, boardNumber: 0 })}
        clubId={club._id}
        boardNumber={qrCodeModal.boardNumber}
        boardName={qrCodeModal.boardName}
      />
      
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center vspace">
        {userRole === 'admin' && (
          <button
            className="btn btn-primary btn-outline btn-sm md:btn-md flex items-center gap-2 w-full sm:w-auto"
            onClick={handleDeactivateClub}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Klub Deaktiválása
          </button>
        )}

        <button
          className="btn btn-primary btn-outline btn-sm md:btn-md flex items-center gap-2 w-full sm:w-auto"
          onClick={handleLeaveClub}
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Kilépés a klubból
        </button>
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
        settings={settingsSection}
        defaultPage={getDefaultPage()}
      >
        <p>test</p>
      </ClubLayout>
      
      {/* Club Share Modal - outside ClubLayout so it's always accessible */}
      <ClubShareModal
        isOpen={clubShareModal}
        onClose={() => setClubShareModal(false)}
        clubCode={code}
        clubName={club.name}
      />
    </>
  );
}