import React, { useState } from 'react';
import axios from 'axios';
import PlayerSearch from '@/components/club/PlayerSearch';
import { toast } from 'react-hot-toast';

interface TournamentPlayersProps {
  tournament: any;
  players: any[];
  user: any;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  userPlayerStatus: 'applied' | 'checked-in' | 'none';
  userPlayerId: string | null;
}

const TournamentPlayers: React.FC<TournamentPlayersProps> = ({
  tournament,
  players,
  user,
  userClubRole,
  userPlayerStatus,
  userPlayerId,
}) => {
  const [error, setError] = useState('');
  const [localPlayers, setLocalPlayers] = useState(players);
  const [localUserPlayerStatus, setLocalUserPlayerStatus] = useState(userPlayerStatus);
  const [localUserPlayerId, setLocalUserPlayerId] = useState(userPlayerId);
  const code = tournament?.tournamentId;

  // Update local state when props change
  React.useEffect(() => {
    setLocalPlayers(players);
    setLocalUserPlayerStatus(userPlayerStatus);
    setLocalUserPlayerId(userPlayerId);
  }, [players, userPlayerStatus, userPlayerId]);

  const handleAddPlayer = async (player: any) => {
    try {
      const payload: any = {};
      
      // If player already has an _id and it's a guest player (no userRef), use it
      if (player._id && !player.userRef && !player.username) {
        payload.playerId = player._id;
      } else {
        // If no _id or has userRef/username, we need to create a new player
        if (player.userRef) {
          payload.userRef = player.userRef;
          payload.name = player.name;
        } else {
          payload.name = player.name;
        }
      }
      
      const response = await axios.post(`/api/tournaments/${code}/players`, payload);
      if (response.data.success) {
        // Update local state immediately
        const newPlayer = {
          _id: response.data.playerId,
          playerReference: {
            _id: response.data.playerId,
            name: player.name,
            userRef: player.userRef
          },
          status: 'applied'
        };
        setLocalPlayers(prev => [...prev, newPlayer]);
        toast.success(`${player.name || 'Játékos'} sikeresen hozzáadva!`);
      } else {
        setError('Nem sikerült hozzáadni a játékost.');
        toast.error('Nem sikerült hozzáadni a játékost.');
      }
    } catch (err) {
      setError('Nem sikerült hozzáadni a játékost.');
      toast.error('Nem sikerült hozzáadni a játékost.');
      console.error('Add player error:', err);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId } });
      if (response.data.success) {
        // Update local state immediately
        setLocalPlayers(prev => prev.filter(p => p.playerReference._id !== playerId));
        toast.success('Játékos sikeresen eltávolítva!');
      } else {
        setError('Nem sikerült eltávolítani a játékost.');
        toast.error('Nem sikerült eltávolítani a játékost.');
      }
    } catch (err) {
      setError('Nem sikerült eltávolítani a játékost.');
      toast.error('Nem sikerült eltávolítani a játékost.');
      console.error('Remove player error:', err);
    }
  };

  const handleCheckInPlayer = async (playerId: string) => {
    try {
      const response = await axios.put(`/api/tournaments/${code}/players`, { playerId, status: 'checked-in' });
      if (response.data.success) {
        // Update local state immediately
        setLocalPlayers(prev => prev.map(p => 
          p.playerReference._id === playerId 
            ? { ...p, status: 'checked-in' }
            : p
        ));
        toast.success('Játékos sikeresen check-inelve!');
      } else {
        setError('Nem sikerült check-inelni a játékost.');
        toast.error('Nem sikerült check-inelni a játékost.');
      }
    } catch (err) {
      setError('Nem sikerült check-inelni a játékost.');
      toast.error('Nem sikerült check-inelni a játékost.');
      console.error('Check in player error:', err);
    }
  };

  const handleSelfSignUp = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.post(`/api/tournaments/${code}/players`, { userRef: user._id, name: user.name });
      if (response.data.success) {
        // Update local state immediately
        const newPlayer = {
          _id: response.data.playerId,
          playerReference: {
            _id: response.data.playerId,
            name: user.name,
            userRef: user._id
          },
          status: 'applied'
        };
        setLocalPlayers(prev => [...prev, newPlayer]);
        setLocalUserPlayerStatus('applied');
        setLocalUserPlayerId(response.data.playerId);
        toast.success('Sikeresen jelentkeztél a tornára!');
      } else {
        setError('Nem sikerült jelentkezni a tornára.');
        toast.error('Nem sikerült jelentkezni a tornára.');
      }
    } catch (err) {
      setError('Nem sikerült jelentkezni a tornára.');
      toast.error('Nem sikerült jelentkezni a tornára.');
      console.error('Self sign up error:', err);
    }
  };

  const handleSelfWithdraw = async () => {
    if (!localUserPlayerId) return;
    try {
      const response = await axios.delete(`/api/tournaments/${code}/players`, { data: { playerId: localUserPlayerId } });
      if (response.data.success) {
        // Update local state immediately
        setLocalPlayers(prev => prev.filter(p => p.playerReference._id !== localUserPlayerId));
        setLocalUserPlayerStatus('none');
        setLocalUserPlayerId(null);
        toast.success('Jelentkezés sikeresen visszavonva!');
      } else {
        setError('Nem sikerült visszavonni a jelentkezést.');
        toast.error('Nem sikerült visszavonni a jelentkezést.');
      }
    } catch (err) {
      setError('Nem sikerült visszavonni a jelentkezést.');
      toast.error('Nem sikerült visszavonni a jelentkezést.');
      console.error('Self withdraw error:', err);
    }
  };

  // Calculate if there are free spots
  const maxPlayers = tournament?.tournamentSettings?.maxPlayers || 0;
  const currentPlayers = localPlayers.length;
  const hasFreeSpots = currentPlayers < maxPlayers;
  
  // Check if tournament is in pending status
  const isPending = tournament?.tournamentSettings?.status === 'pending';
  
  // Check if registration is open
  const startDate = tournament?.tournamentSettings?.startDate;
  const registrationDeadline = tournament?.tournamentSettings?.registrationDeadline;
  const now = new Date();
  
  let registrationOpen = true;
  
  if (registrationDeadline) {
    registrationOpen = registrationOpen && now < new Date(registrationDeadline);
  } else if (startDate) {
    registrationOpen = registrationOpen && now < new Date(startDate - 60 * 60 * 1000); // 1 hour before start
  }
  
  // Check if groups are generated (tournament moved to group-stage or beyond)
  const groupsGenerated = tournament?.tournamentSettings?.status !== 'pending';
  
  // Allow admin/moderator actions until groups are generated
  const allowAdminActions = !groupsGenerated;
  
  // Allow player registration only if registration is open and tournament is pending
  const allowPlayerRegistration = registrationOpen && isPending;


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
        <PlayerSearch 
          onPlayerSelected={handleAddPlayer} 
          clubId={tournament?.clubId?._id || tournament?.clubId}
          isForTournament={true}
          excludePlayerIds={localPlayers.map(p => p.playerReference?._id?.toString() || p._id?.toString()).filter(Boolean)}
        />
      )}
      
      <ul className="mt-4 space-y-2">
        {localPlayers.length === 0 && <li className="text-base-content/60">Nincs játékos.</li>}
        {localPlayers.map((player) => (
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
                {user && localUserPlayerId === player.playerReference._id && localUserPlayerStatus !== 'none' && (
                  <button className="btn btn-xs btn-warning ml-2" onClick={handleSelfWithdraw}>Jelentkezés visszavonása</button>
                )}
              </>
            ) : (
              // Show player statistics for tournaments where groups are generated
              <div className="flex gap-2 text-sm w-1/2 ">
                <div className="flex items-center gap-1 w-1/3">
                {player.tournamentStanding && <span className="text-base-content/60 text-sm">Top: {player.tournamentStanding}</span>}
                </div>
                <div className="flex items-center gap-1 w-1/3 ">
                  <span className="text-base-content/60">HC:</span>
                  <span className="font-semibold text-primary">
                    {player.stats?.highestCheckout || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 w-1/3">

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
          {user && localUserPlayerStatus === 'none' && hasFreeSpots && (
            <button className="btn btn-primary mt-4" onClick={handleSelfSignUp}>Jelentkezés a tornára</button>
          )}
          {user && localUserPlayerStatus === 'none' && !hasFreeSpots && (
            <div className="mt-4 text-warning">A torna megtelt, nincs több szabad hely.</div>
          )}
          {!user && (
            <div className="mt-4">
              <a href={`/auth/login?redirect=${encodeURIComponent(`/tournaments/${code}`)}`} className="btn btn-accent">Jelentkezéshez lépj be</a>
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