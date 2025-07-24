"use client"
import React, { useEffect, useState } from 'react';
import { useUserContext } from '@/hooks/useUser';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import PlayerSearch from '@/components/club/PlayerSearch';

const TournamentPage = () => {
  const { code } = useParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [userClubRole, setUserClubRole] = useState<'admin' | 'moderator' | 'member' | 'none'>('none');
  const [userPlayerStatus, setUserPlayerStatus] = useState<'applied' | 'checked-in' | 'none'>('none');
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null);
  const { user } = useUserContext();

  // Bulk fetch for tournament and user role
  const fetchAll = async () => {
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
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, [code, user]);

  // Helper for all mutations: run fetchAll in parallel after success
  const afterMutation = async (success: boolean, errorMsg: string) => {
    if (success) {
      await fetchAll();
    } else {
      setError(errorMsg);
    }
  };

  const handleAddPlayer = async (player: any) => {
    try {
      const payload: any = {};
      if (player.userRef) payload.userRef = player.userRef;
      if (player.name) payload.name = player.name;
      const response = await axios.post(`/api/tournaments/${code}/players`, payload);
      await afterMutation(response.data.success, 'Nem sikerült hozzáadni a játékost.');
    } catch (err) {
      setError('Nem sikerült hozzáadni a játékost.');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId } });
      await afterMutation(response.data.success, 'Nem sikerült eltávolítani a játékost.');
    } catch (err) {
      setError('Nem sikerült eltávolítani a játékost.');
    }
  };

  const handleCheckInPlayer = async (playerId: string) => {
    try {
      const response = await axios.put(`/api/tournaments/${code}/players`, { playerId, status: 'checked-in' });
      await afterMutation(response.data.success, 'Nem sikerült check-inelni a játékost.');
    } catch (err) {
      setError('Nem sikerült check-inelni a játékost.');
    }
  };

  const handleSelfSignUp = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.post(`/api/tournaments/${code}/players`, { userRef: user._id, name: user.name });
      await afterMutation(response.data.success, 'Nem sikerült jelentkezni a tornára.');
    } catch (err) {
      setError('Nem sikerült jelentkezni a tornára.');
    }
  };

  const handleSelfWithdraw = async () => {
    if (!userPlayerId) return;
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId: userPlayerId } });
      await afterMutation(response.data.success, 'Nem sikerült visszavonni a jelentkezést.');
    } catch (err) {
      setError('Nem sikerült visszavonni a jelentkezést.');
    }
  };

  if (loading) return <div className="p-8">Betöltés...</div>;
  if (error) return <div className="p-8 text-error">{error}</div>;
  if (!tournament) return <div className="p-8">Nincs ilyen torna.</div>;

  // Calculate if there are free spots
  const maxPlayers = tournament?.tournamentSettings?.maxPlayers || 0;
  const currentPlayers = players.length;
  const hasFreeSpots = currentPlayers < maxPlayers;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-2">{tournament.tournamentSettings?.name}</h1>
      <div className="mb-4">
        <span className="font-semibold">Formátum:</span> {tournament.tournamentSettings?.format}<br />
        <span className="font-semibold">Kezdés:</span> {tournament.tournamentSettings?.startDate ? new Date(tournament.tournamentSettings.startDate).toLocaleString() : '-'}<br />
        <span className="font-semibold">Nevezési díj:</span> {tournament.tournamentSettings?.entryFee} Ft<br />
        <span className="font-semibold">Max. létszám:</span> {tournament.tournamentSettings?.maxPlayers}<br />
        <span className="font-semibold">Kezdő pontszám:</span> {tournament.tournamentSettings?.startingScore}<br />
        <span className="font-semibold">Leírás:</span> {tournament.tournamentSettings?.description || '-'}
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Klub</h2>
        <div><span className="font-semibold">Név:</span> {tournament.clubId?.name}</div>
        <div><span className="font-semibold">Helyszín:</span> {tournament.clubId?.location}</div>
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Játékosok</h2>
        {(userClubRole === 'admin' || userClubRole === 'moderator') && (
          <PlayerSearch onPlayerSelected={handleAddPlayer} />
        )}
        <ul className="mt-4 space-y-2">
          {players.length === 0 && <li className="text-base-content/60">Nincs játékos.</li>}
          {players.map((player) => (
            <li key={player._id} className="flex items-center gap-4 p-2 bg-base-100 rounded shadow">
              <span className="flex-1">{player.playerReference?.name || player.name || player._id}</span>
              <span className="px-2 py-1 text-xs rounded bg-base-200">{player.status}</span>
              {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                <>
                  {player.status !== 'checked-in' && (
                    <button className="btn btn-xs btn-success mr-2" onClick={() => handleCheckInPlayer(player.playerReference._id)}>
                      Check-in
                    </button>
                  )}
                  <button className="btn btn-xs btn-error" onClick={() => handleRemovePlayer(player.playerReference._id)}>
                    Eltávolítás
                  </button>
                </>
              )}
              {user && userPlayerId === player.playerReference._id && userPlayerStatus !== 'none' && (
                <button className="btn btn-xs btn-warning ml-2" onClick={handleSelfWithdraw}>Jelentkezés visszavonása</button>
              )}
            </li>
          ))}
        </ul>
        {/* Jelentkezés gomb vagy login link */}
        {user && userPlayerStatus === 'none' && hasFreeSpots && (
          <button className="btn btn-primary mt-4" onClick={handleSelfSignUp}>Jelentkezés a tornára</button>
        )}
        {user && userPlayerStatus === 'none' && !hasFreeSpots && (
          <div className="mt-4 text-warning">A torna megtelt, nincs több szabad hely.</div>
        )}
        {!user && (
          <div className="mt-4">
            <a href="/auth/login" className="btn btn-accent">Jelentkezéshez lépj be</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentPage;