import React, { useState } from 'react';
import axios from 'axios';
import PlayerSearch from '@/components/club/PlayerSearch';

interface TournamentPlayersProps {
  tournament: any;
  players: any[];
  user: any;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  userPlayerStatus: 'applied' | 'checked-in' | 'none';
  userPlayerId: string | null;
  onRefetch: () => void;
}

const TournamentPlayers: React.FC<TournamentPlayersProps> = ({
  tournament,
  players,
  user,
  userClubRole,
  userPlayerStatus,
  userPlayerId,
  onRefetch,
}) => {
  const [error, setError] = useState('');
  const code = tournament?.tournamentId;

  const handleAddPlayer = async (player: any) => {
    try {
      const payload: any = {};
      if (player.userRef) payload.userRef = player.userRef;
      if (player.name) payload.name = player.name;
      const response = await axios.post(`/api/tournaments/${code}/players`, payload);
      if (response.data.success) onRefetch();
      else setError('Nem sikerült hozzáadni a játékost.');
    } catch (err) {
      setError('Nem sikerült hozzáadni a játékost.');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId } });
      if (response.data.success) onRefetch();
      else setError('Nem sikerült eltávolítani a játékost.');
    } catch (err) {
      setError('Nem sikerült eltávolítani a játékost.');
    }
  };

  const handleCheckInPlayer = async (playerId: string) => {
    try {
      const response = await axios.put(`/api/tournaments/${code}/players`, { playerId, status: 'checked-in' });
      if (response.data.success) onRefetch();
      else setError('Nem sikerült check-inelni a játékost.');
    } catch (err) {
      setError('Nem sikerült check-inelni a játékost.');
    }
  };

  const handleSelfSignUp = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.post(`/api/tournaments/${code}/players`, { userRef: user._id, name: user.name });
      if (response.data.success) onRefetch();
      else setError('Nem sikerült jelentkezni a tornára.');
    } catch (err) {
      setError('Nem sikerült jelentkezni a tornára.');
    }
  };

  const handleSelfWithdraw = async () => {
    if (!userPlayerId) return;
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId: userPlayerId } });
      if (response.data.success) onRefetch();
      else setError('Nem sikerült visszavonni a jelentkezést.');
    } catch (err) {
      setError('Nem sikerült visszavonni a jelentkezést.');
    }
  };

  // Calculate if there are free spots
  const maxPlayers = tournament?.tournamentSettings?.maxPlayers || 0;
  const currentPlayers = players.length;
  const hasFreeSpots = currentPlayers < maxPlayers;
  
  // Check if tournament is in pending status
  const isPending = tournament?.tournamentSettings?.status === 'pending';
  
  // Check if registration is open
  const startDate = tournament?.tournamentSettings?.startDate;
  const registrationDeadline = tournament?.tournamentSettings?.registrationDeadline;
  const now = new Date();
  
  let registrationOpen = tournament?.tournamentSettings?.registrationOpen !== false;
  
  if (registrationDeadline) {
    registrationOpen = registrationOpen && now < new Date(registrationDeadline);
  } else if (startDate) {
    registrationOpen = registrationOpen && now < new Date(startDate - 60 * 60 * 1000); // 1 hour before start
  }
  
  // Check if groups are generated (tournament moved to group-stage or beyond)
  const groupsGenerated = tournament?.tournamentSettings?.status !== 'pending';
  
  // Allow admin/moderator actions until groups are generated
  const allowAdminActions = !groupsGenerated;
  
  // Allow player registration only if registration is open
  const allowPlayerRegistration = registrationOpen && isPending;

  console.log(players);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">Játékosok</h2>
        {isPending && (
          <span className={`badge badge-sm ${allowPlayerRegistration ? 'badge-success' : 'badge-error'}`}>
            {allowPlayerRegistration ? 'Nevezés nyitva' : 'Nevezés zárva'}
          </span>
        )}
      </div>
      {error && <div className="mb-2 text-error">{error}</div>}
      
      {/* Show player management only if admin actions are allowed */}
      {allowAdminActions && (userClubRole === 'admin' || userClubRole === 'moderator') && (
        <PlayerSearch onPlayerSelected={handleAddPlayer} />
      )}
      
      <ul className="mt-4 space-y-2">
        {players.length === 0 && <li className="text-base-content/60">Nincs játékos.</li>}
        {players.map((player) => (
          <li key={player._id} className="flex items-center gap-4 p-2 bg-base-100 rounded shadow">
            <span className="flex-1">{player.playerReference?.name || player.name || player._id}</span>
            
            {allowAdminActions ? (
              // Show status and action buttons for tournaments where admin actions are allowed
              <>
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
              </>
            ) : (
              // Show player statistics for tournaments where groups are generated
              <div className="flex gap-4 text-sm w-1/3 ">
                <div className="flex items-center gap-1 w-1/2 ">
                  <span className="text-base-content/60">HC:</span>
                  <span className="font-semibold text-primary">
                    {player.stats?.highestCheckout || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 w-1/2">

                  <span className="font-semibold text-primary">
                    {player.stats.oneEightiesCount}
                  </span>
                  <span className="text-base-content/60">x180</span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      
      {/* Show signup button only if player registration is allowed */}
      {allowPlayerRegistration && (
        <>
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
        </>
      )}
      
      {/* Show registration status message */}
      {!allowPlayerRegistration && isPending && (
        <div className="mt-4 p-3 bg-warning/10 text-warning rounded-lg">
          <p className="font-semibold">Nevezés zárva</p>
          <p className="text-sm">
            {registrationDeadline 
              ? `A nevezési határidő (${new Date(registrationDeadline).toLocaleDateString('hu-HU')}) lejárt.`
              : 'A nevezés már lezárult.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default TournamentPlayers; 