"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserContext } from '@/hooks/useUser';
import { Club } from '@/interface/club.interface';
import ClubLayout from '@/components/club/ClubLayout';
import ClubInfo from '@/components/club/ClubInfo';
import MemberList from '@/components/club/MemberList';
import TournamentList from '@/components/club/TournamentList';
import AddPlayerModal from '@/components/club/AddPlayerModal';
import CreateTournamentModal from '@/components/club/CreateTournamentModal';
import EditClubModal from '@/components/club/EditClubModal';
import PlayerSearch from '@/components/club/PlayerSearch';


export default function ClubDetailPage() {
  const { user } = useUserContext();
  const [club, setClub] = useState<Club | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member' | 'none'>('none');
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false);
  const [isEditClubModalOpen, setIsEditClubModalOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  // Board management state
  const [boardEdit, setBoardEdit] = useState<{ boardNumber: number; name: string } | null>(null);
  const [boardAddOpen, setBoardAddOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

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
      if (!code || !user?._id) {
        router.push('/auth/login');
        return;
      }

      const toastId = toast.loading('Klub adatok betöltése...');
      try {
        const clubResponse = await axios.get<Club>(`/api/clubs?clubId=${code}`);
        setClub(clubResponse.data);

        const roleResponse = await axios.get<{ role: 'admin' | 'moderator' | 'member' | 'none' }>(
          `/api/clubs/user/role?clubId=${code}&userId=${user._id}`
        );
        setUserRole(roleResponse.data.role);

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
  const now = new Date();
  const tournaments = club.tournaments || [];
  const pastTournaments = tournaments.filter(t => t.status === 'finished').length;
  const ongoingTournaments = tournaments.filter(t => t.status === 'active').length;
  const upcomingTournaments = tournaments.filter(t => t.status === 'pending').length;

  // Summary section
  const summarySection = (
    <div className="space-y-6">
      <section className="bg-base-200 rounded-2xl shadow-xl p-6 flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-primary mb-1">{club.name}</h2>
        <div className="text-lg text-base-content/80 mb-2">{club.description}</div>
        <div className="flex flex-wrap gap-4 items-center text-base-content/60">
          <span>Helyszín: <span className="font-medium text-base-content">{club.location}</span></span>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-base-200 rounded-xl p-6 flex flex-col items-center">
          <span className="text-4xl font-bold text-primary">{numPlayers}</span>
          <span className="text-base-content/70 mt-2">Játékos</span>
        </div>
        <div className="bg-base-200 rounded-xl p-6 flex flex-col items-center">
          <span className="text-4xl font-bold text-accent">{pastTournaments}</span>
          <span className="text-base-content/70 mt-2">Befejezett verseny</span>
        </div>
        <div className="bg-base-200 rounded-xl p-6 flex flex-col items-center">
          <span className="text-4xl font-bold text-success">{ongoingTournaments + upcomingTournaments}</span>
          <span className="text-base-content/70 mt-2">Aktív vagy közelgő verseny</span>
        </div>
      </div>
    </div>
  );

  // Players section
  const playersSection = (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-primary mb-4">Játékosok</h2>
      {club.members.length === 0 ? (
        <div className="text-base-content/60">Nincsenek tagok ebben a klubban.</div>
      ) : (
        <ul className="space-y-2">
          {club.members.map((member: any) => (
            <li key={member._id} className="text-lg">
              {member.name}{' '}
              {member.userRef ? (
                <span className="text-base-content/50">(regisztrált)</span>
              ) : member.username === 'vendég' ? (
                <span className="text-base-content/50">(vendég)</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
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
    <div className="space-y-6">
      <div className="card-section">
        <div className="section-header">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Klub adatok szerkesztése
        </div>
        <button className="btn btn-primary" onClick={() => setIsEditClubModalOpen(true)}>
          Klub szerkesztése
        </button>
        <button className="btn btn-primary ml-2" onClick={() => setIsCreateTournamentModalOpen(true)}>
          Új verseny indítása
        </button>
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
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 01.88 7.75M8 3.13a4 4 0 00-.88 7.75" /></svg>
          Tagok kezelése
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
        />
      </div>
      <div className="card-section">
        <div className="section-header">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
          Táblák kezelése
        </div>
        <div className="mb-2 text-base-content/70">Összesen {club.boards?.length || 0} tábla</div>
        <ul className="space-y-2 mb-4">
          {club.boards && club.boards.length > 0 ? (
            club.boards.map((board: any) => (
              <li key={board.boardNumber} className="flex items-center gap-2">
                <span className="font-semibold">#{board.boardNumber}</span>
                {board.name && <span className="text-base-content/60">{board.name}</span>}
                <button className="btn btn-xs btn-outline" onClick={() => setBoardEdit({ boardNumber: board.boardNumber, name: board.name || '' })}>Szerkesztés</button>
                <button className="btn btn-xs btn-error" onClick={() => handleRemoveBoard(board.boardNumber)}>Törlés</button>
              </li>
            ))
          ) : (
            <li className="text-base-content/60">Nincsenek táblák.</li>
          )}
        </ul>
        <button className="btn btn-sm btn-primary" onClick={() => setBoardAddOpen(true)}>Új tábla hozzáadása</button>
        {/* Add Board Modal */}
        {boardAddOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-base-200 rounded-xl p-6 shadow-xl w-full max-w-xs">
              <h3 className="text-lg font-bold mb-2">Új tábla hozzáadása</h3>
              <input
                type="text"
                className="input input-bordered w-full mb-4"
                placeholder="Tábla neve (opcionális)"
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setBoardAddOpen(false)}>Mégse</button>
                <button className="btn btn-primary" onClick={handleAddBoard}>Hozzáadás</button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Board Modal */}
        {boardEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-base-200 rounded-xl p-6 shadow-xl w-full max-w-xs">
              <h3 className="text-lg font-bold mb-2">Tábla szerkesztése</h3>
              <input
                type="text"
                className="input input-bordered w-full mb-4"
                placeholder="Tábla neve"
                value={boardEdit.name}
                onChange={e => setBoardEdit({ ...boardEdit, name: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setBoardEdit(null)}>Mégse</button>
                <button className="btn btn-primary" onClick={handleEditBoard}>Mentés</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-center justify-center vspace">
        {userRole === 'admin' && (
                  <button
                  className="btn btn-primary btn-outline flex items-center gap-2"
                  onClick={handleDeactivateClub}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Klub Deaktiválása
                </button>
        )}

        <button
          className="btn btn-primary btn-outline flex items-center gap-2"
          onClick={handleLeaveClub}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Kilépés a klubból
        </button>
      </div>
    </div>
  ) : null;

  return (
    <ClubLayout
      userRole={userRole}
      clubId={club._id}
      clubName={club.name}
      summary={summarySection}
      players={playersSection}
      tournaments={tournamentsSection}
      settings={settingsSection}
    >
      <p>test</p>
    </ClubLayout>
  );
}