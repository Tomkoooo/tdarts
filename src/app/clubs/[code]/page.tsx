"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserContext } from '@/hooks/useUser';
import { Club } from '@/interface/club.interface';
import ClubLayout from '@/components/club/ClubLayout';
import ClubInfo from '@/components/club/ClubInfo';
import MemberList from '@/components/club/MemberList';
import TournamentPlayerList from '@/components/club/TournamentPlayerList';
import TournamentList from '@/components/club/TournamentList';
import AddPlayerModal from '@/components/club/AddPlayerModal';
import CreateTournamentModal from '@/components/club/CreateTournamentModal';
import EditClubModal from '@/components/club/EditClubModal';


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
      toast.success('Klub sikeresen deaktiválva!', { id: toastId });
      router.push('/clubs');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Klub deaktiválása sikertelen', { id: toastId });
    }
  };

  if (!club) return null;

  return (
    <ClubLayout>
      <div className='md:flex gap-3 w-full items-center flex flex-col md:flex-row'>
        <ClubInfo club={club} userRole={userRole} onEdit={() => setIsEditClubModalOpen(true)} />
        <div className='flex flex-col gap-3 w-full'>
          <MemberList
            club={club}
            members={club.members}
            userRole={userRole}
            userId={user?._id}
            clubId={club._id}
            onAddMember={() => setIsAddPlayerModalOpen(true)}
            onClubUpdated={setClub}
          />
          <TournamentPlayerList
            players={club.tournamentPlayers}
            userRole={userRole}
            userId={user?._id}
            clubId={club._id}
            onAddPlayer={() => setIsAddPlayerModalOpen(true)}
            onClubUpdated={setClub}
          />
        </div>
      </div>
      <div className='flex gap-3 items-center justify-center'>
      {userRole === 'admin' && (
        <div className=" text-center">
          <button
            className="btn btn-primary btn-outline btn-md"
            onClick={handleDeactivateClub}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Klub Deaktiválása
          </button>
        </div>
      )}
      {userRole !== 'none' && (
        <div className=" text-center ">
          <button
            className="btn btn-primary btn-outline btn-md"
            onClick={handleLeaveClub}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Kilépés a klubból
          </button>
        </div>
      )}
      </div>
      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        clubId={club._id}
        userId={user?._id}
        existingMembers={club.members}
        existingPlayers={club.tournamentPlayers}
        onClubUpdated={setClub}
        userRole={userRole}
      />
      <CreateTournamentModal
        club={club}
        isOpen={isCreateTournamentModalOpen}
        onClose={() => setIsCreateTournamentModalOpen(false)}
        clubId={club._id}
        members={club.members}
        players={club.tournamentPlayers}
        onClubUpdated={setClub}
      />
      <EditClubModal
        userId={user?._id}
        isOpen={isEditClubModalOpen}
        onClose={() => setIsEditClubModalOpen(false)}
        club={club}
        onClubUpdated={setClub}
      />
    </ClubLayout>
  );
}