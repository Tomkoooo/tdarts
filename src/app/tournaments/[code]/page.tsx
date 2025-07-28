"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useUserContext } from '@/hooks/useUser';
import { useParams } from 'next/navigation';
import axios from 'axios';
import TournamentInfo from '@/components/tournament/TournamentInfo';
import TournamentPlayers from '@/components/tournament/TournamentPlayers';
import TournamentGroupsGenerator from '@/components/tournament/TournamentGroupsGenerator';
import TournamentGroupsView from '@/components/tournament/TournamentGroupsView';
import TournamentBoardsView from '@/components/tournament/TournamentBoardsView';

const TournamentPage = () => {
  const { code } = useParams();
  const [tournament, setTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userClubRole, setUserClubRole] = useState<'admin' | 'moderator' | 'member' | 'none'>('none');
  const [userPlayerStatus, setUserPlayerStatus] = useState<'applied' | 'checked-in' | 'none'>('none');
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const { user } = useUserContext();

  // Bulk fetch for tournament and user role
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [axios.get(`/api/tournaments/${code}`)];
      if (user?._id) {
        requests.push(axios.get(`/api/tournaments/${code}/getUserRole`, { headers: { 'x-user-id': user._id } }));
        requests.push(axios.get(`/api/tournaments/${code}/players`, { headers: { 'x-user-id': user._id } }));
      }
      const [tournamentRes, userRoleRes, playerIdRes] = await Promise.all(requests);
      setTournament(tournamentRes.data);
      setPlayers(tournamentRes.data.tournamentPlayers || []);
      if (user?._id) {
        setUserClubRole(userRoleRes.data.userClubRole || 'none');
        setUserPlayerStatus(userRoleRes.data.userPlayerStatus || 'none');
        setUserPlayerId(playerIdRes.data ? playerIdRes.data : null);
      } else {
        setUserClubRole('none');
        setUserPlayerStatus('none');
        setUserPlayerId(null);
      }

    } catch (err) {
      setError('Nem sikerült betölteni a tornát vagy a szerepeket.');
    } finally {
      setLoading(false);
    }
  }, [code, user]);

  console.log(tournament);  

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, [code, user, fetchAll]);

  // Handler for child components to request a refetch
  const handleRefetch = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <div className="p-8">Betöltés...</div>;
  if (error) return <div className="p-8 text-error">{error}</div>;
  if (!tournament) return <div className="p-8">Nincs ilyen torna.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <TournamentInfo tournament={tournament} />
      <TournamentBoardsView tournament={tournament} />
      <TournamentGroupsGenerator
        tournament={tournament}
        userClubRole={userClubRole}
        onRefetch={handleRefetch}
      />
      <TournamentGroupsView tournament={tournament} />
      <TournamentPlayers
        tournament={tournament}
        players={players}
        user={user}
        userClubRole={userClubRole}
        userPlayerStatus={userPlayerStatus}
        userPlayerId={userPlayerId}
        onRefetch={handleRefetch}
      />
    </div>
  );
};

export default TournamentPage;