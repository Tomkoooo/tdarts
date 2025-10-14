import React, { useState } from 'react';
import axios from 'axios';
import PlayerSearch from '@/components/club/PlayerSearch';
import PlayerNotificationModal from '@/components/tournament/PlayerNotificationModal';
import PlayerMatchesModal from './PlayerMatchesModal';
import LegsViewModal from './LegsViewModal';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useUserContext } from '@/hooks/useUser';
import { IconMail, IconCheck, IconTrash, IconBell, IconBellOff, IconArrowUp } from '@tabler/icons-react';

interface TournamentPlayersProps {
  tournament: any;
  players: any[];
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  userPlayerStatus: 'applied' | 'checked-in' | 'none';
  userPlayerId: string | null;
}

const TournamentPlayers: React.FC<TournamentPlayersProps> = ({
  tournament,
  players,
  userClubRole,
  userPlayerStatus,
  userPlayerId,
}) => {
  const [error, setError] = useState('');
  const [localPlayers, setLocalPlayers] = useState(players);
  const {user} = useUserContext()
  const [localUserPlayerStatus, setLocalUserPlayerStatus] = useState(userPlayerStatus);
  const [localUserPlayerId, setLocalUserPlayerId] = useState(userPlayerId);
  const [waitingList, setWaitingList] = useState(tournament?.waitingList || []);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedPlayerForMatches, setSelectedPlayerForMatches] = useState<{id: string, name: string} | null>(null);
  const [showPlayerMatchesModal, setShowPlayerMatchesModal] = useState(false);
  const [showDetailedStatsModal, setShowDetailedStatsModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    player: any;
  }>({ isOpen: false, player: null });

  // Check if detailed statistics are enabled
  const code = tournament?.tournamentId;

  // Check if user is subscribed to notifications
  React.useEffect(() => {
    if (user && tournament?.notificationSubscribers) {
      const subscribed = tournament.notificationSubscribers.some(
        (s: any) => s.userRef?._id?.toString() === user._id || s.userRef?.toString() === user._id
      );
      setIsSubscribed(subscribed);
    }
  }, [user, tournament?.notificationSubscribers]);

  // Update local state when props change
  React.useEffect(() => {
    setLocalPlayers(players);
    setLocalUserPlayerStatus(userPlayerStatus);
    setLocalUserPlayerId(userPlayerId);
    setWaitingList(tournament?.waitingList || []);
  }, [players, userPlayerStatus, userPlayerId, tournament?.waitingList]);

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
    const player = localPlayers.find(p => p.playerReference._id === playerId);
    const playerName = player?.playerReference?.name || 'Játékos';
    
    if (!window.confirm(`Biztosan el szeretnéd távolítani ${playerName} játékost a tornáról? Ez a művelet nem vonható vissza.`)) {
      return;
    }
    
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

  const handlePlayerNameClick = (player: any) => {
    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
    const playerName = player.playerReference?.name || player.name || player._id;
    
    if (playerId) {
      setSelectedPlayerForMatches({ id: playerId, name: playerName });
      setShowPlayerMatchesModal(true);
    }
  };

  const handleNotifyPlayer = (player: any) => {
    setNotificationModal({ isOpen: true, player });
  };

  const handleAddToWaitingList = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.post(`/api/tournaments/${code}/waitlist`, { 
        userRef: user._id, 
        name: user.name 
      });
      if (response.data.success) {
        const newWaitingPlayer = {
          playerReference: {
            _id: response.data.playerId,
            name: user.name,
            userRef: user._id
          },
          addedAt: new Date()
        };
        setWaitingList((prev: any[]) => [...prev, newWaitingPlayer]);
        toast.success('Sikeresen felkerültél a várólistára!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült felkerülni a várólistára.');
      console.error('Add to waiting list error:', err);
    }
  };

  const handleRemoveFromWaitingList = async (playerId: string) => {
    try {
      const response = await axios.delete(`/api/tournaments/${code}/waitlist`, { 
        data: { playerId } 
      });
      if (response.data.success) {
        setWaitingList((prev: any[]) => prev.filter((p: any) => p.playerReference._id !== playerId));
        toast.success('Sikeresen lekerültél a várólistáról!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült lekerülni a várólistáról.');
      console.error('Remove from waiting list error:', err);
    }
  };

  const handlePromoteFromWaitingList = async (playerId: string) => {
    try {
      const response = await axios.post(`/api/tournaments/${code}/waitlist/promote`, { playerId });
      if (response.data.success) {
        // Move player from waiting list to tournament players
        const waitingPlayer = waitingList.find((p: any) => p.playerReference._id === playerId);
        if (waitingPlayer) {
          const newPlayer = {
            _id: playerId,
            playerReference: waitingPlayer.playerReference,
            status: 'applied'
          };
          setLocalPlayers((prev: any[]) => [...prev, newPlayer]);
          setWaitingList((prev: any[]) => prev.filter((p: any) => p.playerReference._id !== playerId));
          toast.success('Játékos sikeresen áthelyezve a tornára!');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült áthelyezni a játékost.');
      console.error('Promote from waiting list error:', err);
    }
  };

  const handleSubscribeToNotifications = async () => {
    try {
      const response = await axios.post(`/api/tournaments/${code}/notifications`);
      if (response.data.success) {
        setIsSubscribed(true);
        toast.success('Sikeresen feliratkoztál az értesítésekre!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült feliratkozni.');
      console.error('Subscribe to notifications error:', err);
    }
  };

  const handleUnsubscribeFromNotifications = async () => {
    try {
      const response = await axios.delete(`/api/tournaments/${code}/notifications`);
      if (response.data.success) {
        setIsSubscribed(false);
        toast.success('Sikeresen leiratkoztál az értesítésekről!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült leiratkozni.');
      console.error('Unsubscribe from notifications error:', err);
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
    <div className="mb-4" id="registration">
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

        {/* Show withdrawal button at top if user is registered */}
        {user && localUserPlayerId && localUserPlayerStatus !== 'none' && (
          <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex flex-col items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-warning">Már jelentkeztél erre a tornára</p>
                <p className="text-sm text-base-content/70">Ha mégsem tudsz részt venni, itt visszavonhatod a jelentkezésedet.</p>
              </div>
              <button className="btn btn-sm btn-warning" onClick={handleSelfWithdraw}>
                <span className="hidden sm:inline">Jelentkezés visszavonása</span>
                <span className="sm:hidden">Visszavonás</span>
              </button>
            </div>
          </div>
        )}

        {/* Show signup button only if player registration is allowed AND user is not registered */}
        {allowPlayerRegistration && localUserPlayerStatus === 'none' && (
        <>
          {user &&  hasFreeSpots && (
            <button className="btn btn-primary mt-4" onClick={handleSelfSignUp}>Jelentkezés a tornára</button>
          )}
          {user &&  !hasFreeSpots && (
            <div className="mt-4 space-y-2">
              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="flex-1">
                  <span className="font-semibold">A torna megtelt, nincs több szabad hely.</span>
                  <p className="text-sm mt-1">Kérj email értesítést ha felszabadul hely!</p>
                </div>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={isSubscribed ? handleUnsubscribeFromNotifications : handleSubscribeToNotifications}
                  title={isSubscribed ? 'Értesítés kikapcsolása' : 'Értesítést kérek ha felszabadul hely'}
                >
                  {isSubscribed ? (
                    <IconBellOff size={18} className="text-white" />
                  ) : (
                    <IconBell size={18} className="text-white" />
                  )}
                </button>
              </div>
              <button className="btn btn-secondary w-full" onClick={handleAddToWaitingList}>
                Feliratkozás a várólistára
              </button>
            </div>
          )}
          {!user && (
            <div className="mt-4">
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/tournaments/${code}`)}`} className="btn btn-accent">Jelentkezéshez lépj be</Link>
            </div>
          )}
        </>
      )}

      {/* Waiting list button - only if has free spots and user not in tournament/waitlist */}
      {user && isPending && localUserPlayerStatus === 'none' && hasFreeSpots && !waitingList.some((p: any) => p.playerReference?.userRef?.toString() === user._id || p.playerReference?._id === localUserPlayerId) && (
        <div className="mt-4">
          <div className="alert alert-info shadow-lg">
            <div className="flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h3 className="font-bold">Bizonytalan a részvételed?</h3>
                <div className="text-xs">Iratkozz fel a várólistára, hogy jelezd a szándékodat!</div>
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={handleAddToWaitingList}>
              Várólista
            </button>
          </div>
        </div>
      )}

      {/* Notification subscription - only if has free spots */}
      {user && isPending && localUserPlayerStatus === 'none' && hasFreeSpots && !waitingList.some((p: any) => p.playerReference?.userRef?.toString() === user._id) && (
        <div className="mt-4 flex items-center justify-between p-3 bg-info/10 rounded-lg border border-info/20">
          <div className="flex-1">
            <p className="text-sm font-medium">Értesítést szeretnél ha kevés hely marad?</p>
            <p className="text-xs text-base-content/60">Email értesítést küldünk ha 10 vagy kevesebb hely marad.</p>
          </div>
        </div>
      )}

      
      
      <ul className="mt-4 space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {localPlayers.length === 0 && <li className="text-base-content/60">Nincs játékos.</li>}
        {localPlayers.map((player) => (
          
          <li key={player._id} className="p-3 bg-base-100 rounded shadow">
            {/* Main row with player name, status, and admin buttons */}
            <div className="flex items-center gap-3">
              {/* Player name - takes up most of the space */}
              {allowAdminActions ? (
                <span className="flex-1 text-base font-medium">{player.playerReference?.name || player.name || player._id}</span>
              ) : (
                <button 
                  onClick={() => handlePlayerNameClick(player)}
                  className="flex-1 text-left text-base font-medium hover:text-primary hover:underline transition-colors"
                >
                  {player.playerReference?.name || player.name || player._id}
                </button>
              )}
              
              {allowAdminActions ? (
                // Show status indicator and action buttons for tournaments where admin actions are allowed
                <div className="flex items-center gap-2">
                  {/* Status indicator - only show green check for checked-in players */}
                  {player.status === 'checked-in' && (
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center" title="Check-in">
                        <IconCheck className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                    <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
                      {player.status !== 'checked-in' && (
                        <button 
                          className="btn btn-xs btn-success" 
                          onClick={() => handleCheckInPlayer(player.playerReference._id)}
                          title="Check-in"
                        >
                          <span className="hidden sm:inline">Check-in</span>
                          <span className="sm:hidden">✓</span>
                        </button>
                      )}
                      <div className="flex flex-col gap-2">
                        <button
                          className="btn btn-xs btn-info"
                          onClick={() => handleNotifyPlayer(player)}
                          title="Értesítés küldése"
                        >
                          <IconMail size={16} />
                          <span className="hidden sm:inline ml-1">Értesítés</span>
                        </button>
                        <button
                          className="btn btn-xs btn-error"
                          onClick={() => handleRemovePlayer(player.playerReference._id)}
                          title="Eltávolítás"
                        >
                          <IconTrash size={16} />
                          <span className="hidden sm:inline">Eltávolítás</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
            </div>

            
          </li>
        ))}
      </ul>
      
    
      
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

      {/* User's own waiting list status */}
      {user && isPending && waitingList.some((p: any) => p.playerReference?.userRef?.toString() === user._id) && (
        <div className="mt-4 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-secondary">Várólistán vagy</p>
              <p className="text-sm text-base-content/70">
                {hasFreeSpots 
                  ? 'Ha mégis biztosan részt tudsz venni, jelentkezz a tornára fentebb.'
                  : 'Értesítünk, ha felszabadul hely és a moderátor áthelyez a tornára.'
                }
              </p>
            </div>
            <button 
              className="btn btn-sm btn-error gap-1" 
              onClick={() => {
                const myPlayer = waitingList.find((p: any) => p.playerReference?.userRef?.toString() === user._id);
                if (myPlayer) {
                  handleRemoveFromWaitingList(myPlayer.playerReference._id);
                }
              }}
            >
              <IconTrash size={16} />
              <span className="hidden sm:inline">Lekerülés</span>
            </button>
          </div>
        </div>
      )}

      {/* Waiting List Section */}
      {isPending && waitingList && waitingList.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>Várólista</span>
              <span className="badge badge-secondary badge-sm">{waitingList.length}</span>
            </h3>
          </div>
          
          <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {waitingList.map((waitingPlayer: any, index: number) => {
              const isOwnPlayer = user && waitingPlayer.playerReference?.userRef?.toString() === user._id;
              
              return (
                <li key={waitingPlayer.playerReference?._id || index} className="p-3 bg-base-200 rounded shadow-sm border border-base-300">
                  <div className="flex items-center gap-3">
                    <span className="badge badge-secondary badge-sm">{index + 1}</span>
                    <span className="flex-1 text-sm font-medium">
                      {waitingPlayer.playerReference?.name || 'Ismeretlen játékos'}
                      {isOwnPlayer && <span className="ml-2 text-xs text-secondary">(Te)</span>}
                    </span>
                    <span className="text-xs text-base-content/60">
                      {new Date(waitingPlayer.addedAt).toLocaleDateString('hu-HU')}
                    </span>
                    
                    {/* Admin actions */}
                    {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                      <>
                        {!isOwnPlayer && (
                          <button
                            className="btn btn-xs btn-success gap-1"
                            onClick={() => handlePromoteFromWaitingList(waitingPlayer.playerReference._id)}
                            title="Áthelyezés a tornára (Admin jogosultság - mindig elérhető)"
                          >
                            <IconArrowUp size={14} />
                            <span className="hidden sm:inline">Áthelyezés</span>
                          </button>
                        )}
                        
                        {!isOwnPlayer && (
                          <button
                            className="btn btn-xs btn-ghost text-error"
                            onClick={() => handleRemoveFromWaitingList(waitingPlayer.playerReference._id)}
                            title="Eltávolítás a várólistáról"
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}


      {/* Player Matches Modal */}
      {selectedPlayerForMatches && (
        <PlayerMatchesModal
          isOpen={showPlayerMatchesModal}
          onClose={() => {
            setShowPlayerMatchesModal(false);
            setSelectedPlayerForMatches(null);
          }}
          playerId={selectedPlayerForMatches.id}
          playerName={selectedPlayerForMatches.name}
          tournamentCode={code}
          onShowDetailedStats={(matchId) => {
            setSelectedMatchId(matchId);
            setShowPlayerMatchesModal(false);
            setShowDetailedStatsModal(true);
          }}
        />
      )}

      {/* Detailed Statistics Modal */}
      {selectedMatchId && (
        <LegsViewModal
          isOpen={showDetailedStatsModal}
          onClose={() => {
            setShowDetailedStatsModal(false);
            setSelectedMatchId(null);
          }}
          onBackToMatches={() => {
            setShowDetailedStatsModal(false);
            setShowPlayerMatchesModal(true);
            setSelectedMatchId(null);
          }}
          match={{
            _id: selectedMatchId,
            player1: {
              playerId: {
                _id: selectedPlayerForMatches?.id || '',
                name: selectedPlayerForMatches?.name || ''
              }
            },
            player2: {
              playerId: {
                _id: 'opponent',
                name: 'Ellenfél'
              }
            },
            clubId: tournament?.clubId?._id || tournament?.clubId
          }}
        />
      )}

      {/* Player Notification Modal */}
      <PlayerNotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal({ isOpen: false, player: null })}
        player={notificationModal.player}
        tournamentName={tournament?.tournamentSettings?.name || 'Torna'}
      />
    </div>
  );
};

export default TournamentPlayers; 