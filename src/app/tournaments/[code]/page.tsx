"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useUserContext } from '@/hooks/useUser';
import { useParams } from 'next/navigation';
import axios from 'axios';
import TournamentInfo from '@/components/tournament/TournamentInfo';
import TournamentPlayers from '@/components/tournament/TournamentPlayers';
import TournamentGroupsGenerator from '@/components/tournament/TournamentStatusChanger';
import TournamentGroupsView from '@/components/tournament/TournamentGroupsView';
import TournamentBoardsView from '@/components/tournament/TournamentBoardsView';
import TournamentKnockoutBracket from '@/components/tournament/TournamentKnockoutBracket';

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
    setError('');
    try {
      const requests = [axios.get(`/api/tournaments/${code}`)];
      if (user?._id) {
        requests.push(axios.get(`/api/tournaments/${code}/getUserRole`, { headers: { 'x-user-id': user._id } }));
        requests.push(axios.get(`/api/tournaments/${code}/players`, { headers: { 'x-user-id': user._id } }));
      }
      const [tournamentRes, userRoleRes, playerIdRes] = await Promise.all(requests);
      setTournament(tournamentRes.data);
      
      // Ensure tournamentPlayers are properly populated
      const tournamentData = tournamentRes.data;
      if (tournamentData.tournamentPlayers && Array.isArray(tournamentData.tournamentPlayers)) {
        setPlayers(tournamentData.tournamentPlayers);
        console.log('Tournament players:', tournamentData.tournamentPlayers);
      } else {
        setPlayers([]);
        console.log('No tournament players found');
      }
      
      if (user?._id) {
        setUserClubRole(userRoleRes.data.userClubRole || 'none');
        setUserPlayerStatus(userRoleRes.data.userPlayerStatus || 'none');
        setUserPlayerId(playerIdRes.data ? playerIdRes.data : null);
      } else {
        setUserClubRole('none');
        setUserPlayerStatus('none');
        setUserPlayerId(null);
      }

    } catch (err: any) {
      console.error('Tournament fetch error:', err);
      setError(err.response?.data?.error || 'Nem sikerült betölteni a tornát vagy a szerepeket.');
    } finally {
      setLoading(false);
    }
  }, [code, user]);

    useEffect(() => {
    fetchAll();
  }, [code, user, fetchAll]);

  // Handler for child components to request a refetch
  const handleRefetch = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <h2 className="text-xl font-bold text-primary">Torna betöltése...</h2>
          <p className="text-base-content/70 mt-2">Kérjük várjon</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Hiba történt!</h3>
              <div className="text-xs">{error}</div>
            </div>
          </div>
          <button 
            className="btn btn-primary w-full mt-4"
            onClick={fetchAll}
          >
            Újrapróbálkozás
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-primary mb-2">Torna nem található</h2>
          <p className="text-base-content/70">A keresett torna nem létezik vagy nem elérhető.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            {tournament.tournamentSettings?.name || 'Torna'}
          </h1>
          <p className="text-lg text-base-content/70">
            {tournament.tournamentSettings?.description || 'Torna részletek'}
          </p>
          {userClubRole !== 'none' && (
            <div className="badge badge-primary mt-2">
              {userClubRole === 'admin' ? 'Admin' : 
               userClubRole === 'moderator' ? 'Moderátor' : 'Tag'}
            </div>
          )}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Tournament info and boards */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tournament Info Card */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl font-bold text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Torna Információk
                </h2>
                <TournamentInfo tournament={tournament} />
              </div>
            </div>

            {/* Boards View Card */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl font-bold text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Táblák Állapota
                </h2>
                <TournamentBoardsView tournament={tournament} />
              </div>
            </div>

            {/* Groups Generator Card */}
            {(userClubRole === 'admin' || userClubRole === 'moderator') && tournament.tournamentSettings.status === "pending" && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl font-bold text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    Csoportok Generálása
                  </h2>
                  <TournamentGroupsGenerator
                    tournament={tournament}
                    userClubRole={userClubRole}
                    onRefetch={handleRefetch}
                  />
                </div>
              </div>
            )}

            {/* Groups View Card */}
            {tournament.groups && tournament.groups.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl font-bold text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Csoportok és Meccsek
                  </h2>
                  <TournamentGroupsView tournament={tournament} userClubRole={userClubRole} />
                </div>
              </div>
            )}

            {/* Knockout Bracket Card */}
            {tournament.tournamentSettings?.status === 'knockout' && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl font-bold text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Egyenes Kiesés
                  </h2>
                  <TournamentKnockoutBracket 
                    tournamentCode={tournament.tournamentId} 
                    userClubRole={userClubRole} 
                    onRefetch={handleRefetch}
                    tournamentPlayers={players}
                    knockoutMethod={tournament.tournamentSettings?.knockoutMethod}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right column - Players */}
          <div className="space-y-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl font-bold text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Játékosok
                </h2>
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
            </div>
          </div>
        </div>

        {/* Quick Actions for Admins/Moderators */}
        {(userClubRole === 'admin' || userClubRole === 'moderator') && (
          <div className="mt-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-xl font-bold text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Műveletek
                </h3>
                <div className="flex flex-wrap gap-4">
                  <button 
                    className="btn btn-primary"
                    onClick={() => window.open(`/board/${tournament.tournamentId}`, '_blank')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Tábla Kezelés
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleRefetch}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Frissítés
                  </button>
                  <TournamentGroupsGenerator
                    tournament={tournament}
                    userClubRole={userClubRole}
                    onRefetch={handleRefetch}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentPage;