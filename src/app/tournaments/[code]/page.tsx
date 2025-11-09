"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useUserContext } from '@/hooks/useUser';
import { useTournamentAutoRefresh } from '@/hooks/useAutoRefresh';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useParams } from 'next/navigation';
import axios from 'axios';
import TournamentInfo from '@/components/tournament/TournamentInfo';
import TournamentPlayers from '@/components/tournament/TournamentPlayers';
import TournamentGroupsGenerator from '@/components/tournament/TournamentStatusChanger';
import TournamentGroupsView from '@/components/tournament/TournamentGroupsView';
import TournamentBoardsView from '@/components/tournament/TournamentBoardsView';
import TournamentKnockoutBracket from '@/components/tournament/TournamentKnockoutBracket';
import TournamentShareModal from '@/components/tournament/TournamentShareModal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { QrCode, RefreshCw, Trophy, Users, BarChart3, Target, Zap } from 'lucide-react';

const TournamentPage = () => {
    const { code } = useParams();
    const [tournament, setTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userClubRole, setUserClubRole] = useState<'admin' | 'moderator' | 'member' | 'none'>('none');
  const [userPlayerStatus, setUserPlayerStatus] = useState<'applied' | 'checked-in' | 'none'>('none');
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [tournamentShareModal, setTournamentShareModal] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
    const { user } = useUserContext();

  // Check if Pro features are enabled for this club
  const { isEnabled: isProFeature, isLoading: isFeatureLoading } = useFeatureFlag(
    'detailedStatistics', 
    tournament?.clubId?._id || tournament?.clubId
  );



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
      const [tournamentRes, userRoleRes] = await Promise.all(requests);
      setTournament(tournamentRes.data);
      
      // Ensure tournamentPlayers are properly populated
      const tournamentData = tournamentRes.data;
      if (tournamentData.tournamentPlayers && Array.isArray(tournamentData.tournamentPlayers)) {
        setPlayers(tournamentData.tournamentPlayers);
      } else {
        setPlayers([]);
        console.log('No tournament players found');
      }
      
      if (user?._id) {
        setUserClubRole(userRoleRes.data.userClubRole || 'none');
        setUserPlayerStatus(userRoleRes.data.userPlayerStatus || 'none');
        // Find user's player ID from tournament data
        const userPlayer = tournamentData.tournamentPlayers?.find((p: any) => 
          p.playerReference?.userRef === user._id || p.playerReference?._id?.toString() === user._id
        );
        setUserPlayerId(userPlayer ? userPlayer.playerReference?._id || userPlayer.playerReference : null);
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

    // Auto-refresh for Pro users
    const { isRefreshing, lastRefresh } = useTournamentAutoRefresh(
      code as string,
      fetchAll,
      tournament?.clubId?._id || tournament?.clubId,
      autoRefreshEnabled
    );

    // Debug logging
    console.log('Tournament auto-refresh state:', {
      autoRefreshEnabled,
      isRefreshing,
      lastRefresh,
      clubId: tournament?.clubId?._id || tournament?.clubId,
      isProFeature,
      isFeatureLoading
    });

  // Handler for child components to request a refetch
  const handleRefetch = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // Handler for reopening tournament (Super Admin only)
  const handleReopenTournament = useCallback(async () => {
    // Double-check super admin access
    if (!user || !user._id || user.isAdmin !== true) {
      alert('Nincs jogosultság ehhez a művelethez. Csak super adminok használhatják ezt a funkciót.');
      return;
    }
    
    const confirmMessage = `Biztosan újranyitja ezt a tornát?\n\nEz a művelet:\n- Visszaállítja a torna státuszát "befejezett"-ről "aktív"-ra\n- Törli az összes játékos statisztikáját\n- Megtartja az összes meccs adatot\n- Csak super adminok használhatják\n\nEz a művelet nem vonható vissza!`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setIsReopening(true);
      const response = await axios.post(`/api/tournaments/${code}/reopen`);

      if (response.data.success) {
        alert('Torna sikeresen újranyitva! A statisztikák törölve, a torna újra aktív.');
        await fetchAll(); // Refresh the page data
      }
    } catch (error: any) {
      console.error('Error reopening tournament:', error);
      alert(error.response?.data?.error || 'Hiba történt a torna újranyitása során');
    } finally {
      setIsReopening(false);
    }
  }, [user, code, fetchAll]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Spinner size="lg" className="mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">Torna betöltése...</h2>
            <p className="text-muted-foreground">Kérjük várjon</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-destructive/50">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-lg font-bold mb-2">Hiba történt!</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchAll} className="w-full">
              Újrapróbálkozás
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary mb-2">Torna nem található</h2>
            <p className="text-muted-foreground">A keresett torna nem létezik vagy nem elérhető.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Trophy className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {tournament.tournamentSettings?.name || 'Torna'}
              </h1>
              {lastRefresh && !isRefreshing && (
                <p className="text-xs text-muted-foreground">
                  Utoljára frissítve: {lastRefresh.toLocaleTimeString('hu-HU')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-refresh toggle for Pro users */}
            {user && isProFeature && !isFeatureLoading && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    className="toggle toggle-primary toggle-sm"
                  />
                  <span className="text-sm text-muted-foreground">Auto-frissítés</span>
                </label>
                {isRefreshing && (
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setTournamentShareModal(true)}
              className="gap-2"
            >
              <QrCode className="w-4 h-4" />
              Megosztás
            </Button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="space-y-8">
          {/* Top section - Info, Boards, Groups, Players (side by side) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Tournament info, boards, groups */}
            <div className="lg:col-span-2 space-y-8">

              {/* Tournament Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Target className="w-5 h-5" />
                    Torna Információk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentInfo
                    tournament={tournament}
                    onRefetch={handleRefetch}
                    userRole={userClubRole}
                    userId={user?._id}
                  />
                </CardContent>
              </Card>

              {/* Boards View Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <BarChart3 className="w-5 h-5" />
                    Táblák Állapota
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentBoardsView tournament={tournament} />
                </CardContent>
              </Card>

              {/* Groups View Card */}
              {tournament.groups && tournament.groups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Users className="w-5 h-5" />
                      Csoportok és Meccsek
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TournamentGroupsView tournament={tournament} userClubRole={userClubRole} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column - Players */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Users className="w-5 h-5" />
                    Játékosok
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TournamentPlayers
                    tournament={tournament}
                    players={players}
                    userClubRole={userClubRole}
                    userPlayerStatus={userPlayerStatus}
                    userPlayerId={userPlayerId}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom section - Knockout Bracket (full width) */}
          {(tournament.tournamentSettings?.status === 'knockout' || tournament.tournamentSettings?.status === 'finished' || (tournament.tournamentSettings?.status === 'group-stage' && (tournament.tournamentSettings.format === 'knockout' || tournament.tournamentSettings.format === 'group_knockout'))) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Trophy className="w-5 h-5" />
                  Egyenes Kiesés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TournamentKnockoutBracket
                  tournamentCode={tournament.tournamentId}
                  userClubRole={userClubRole}
                  tournamentPlayers={players}
                  knockoutMethod={tournament.tournamentSettings?.knockoutMethod}
                  clubId={tournament.clubId?.toString()}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Super Admin Actions - Tournament Reopen */}
        {user && user.isAdmin === true && tournament?.tournamentSettings?.status === 'finished' && (
          <div className="mt-8">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Target className="w-5 h-5" />
                  Super Admin Műveletek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-warning mb-1">Torna újranyitása</h4>
                      <p className="text-sm text-muted-foreground">Ez a művelet visszavonja a torna befejezését és törli az összes statisztikát. Csak super adminok használhatják.</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleReopenTournament}
                  disabled={isReopening}
                  className="gap-2"
                >
                  {isReopening ? (
                    <>
                      <Spinner size="sm" />
                      Újranyitás...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Torna újranyitása
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions for Admins/Moderators */}
        {(userClubRole === 'admin' || userClubRole === 'moderator') && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Target className="w-5 h-5" />
                  Admin Műveletek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => window.open(`/board/${tournament.tournamentId}`, '_blank')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Tábla Kezelés
                  </Button>
                  <Button variant="secondary" onClick={() => window.open(`/tournaments/${tournament.tournamentId}/live`, '_blank')}>
                    <Zap className="w-4 h-4 mr-2" />
                    Élő Közvetítés
                  </Button>
                  <Button variant="outline" onClick={handleRefetch}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Frissítés
                  </Button>
                  <TournamentGroupsGenerator
                    tournament={tournament}
                    userClubRole={userClubRole}
                    onRefetch={handleRefetch}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Tournament Share Modal */}
      <TournamentShareModal
        isOpen={tournamentShareModal}
        onClose={() => setTournamentShareModal(false)}
        tournamentCode={tournament.tournamentId}
        tournamentName={tournament.tournamentSettings?.name || 'Torna'}
      />
    </div>
  );
};

export default TournamentPage;