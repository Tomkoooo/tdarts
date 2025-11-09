'use client';
import React, { useState, useEffect } from 'react';
import { IconPlus, IconTrophy, IconUsers, IconTrash, IconShare } from '@tabler/icons-react';
import Link from 'next/link';
import { League } from '@/interface/league.interface';
import CreateLeagueModal from './CreateLeagueModal';
import LeagueDetailModal from './LeagueDetailModal';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface LeagueManagerProps {
  clubId: string;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  autoOpenLeagueId?: string | null;
}

export default function LeagueManager({ clubId, userRole, autoOpenLeagueId }: LeagueManagerProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [clubSubscription, setClubSubscription] = useState<string>('free');
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);
  const [subscriptionModelEnabled, setSubscriptionModelEnabled] = useState<boolean>(true);

  const canManageLeagues = userRole === 'admin' || userRole === 'moderator';
  const canCreateLeagues =
    canManageLeagues &&
    featureEnabled &&
    (!subscriptionModelEnabled || clubSubscription !== 'free');

  useEffect(() => {
    const initializeComponent = async () => {
      const enabled = await checkFeatureEnabled();
      setFeatureEnabled(enabled);

      if (enabled) {
        fetchLeagues();
        fetchClubSubscription();
      } else {
        setLoading(false);
      }
    };

    initializeComponent();
  }, [clubId, autoOpenLeagueId]);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues`);
      if (response.ok) {
        const data = await response.json();
        setLeagues(data.leagues || []);

        if (autoOpenLeagueId && data.leagues) {
          const leagueToOpen = data.leagues.find((league: League) => league._id === autoOpenLeagueId);
          if (leagueToOpen) {
            setSelectedLeague(leagueToOpen);
            setShowDetailModal(true);
          }
        }
      } else {
        setError('Failed to load leagues');
      }
    } catch (err) {
      setError('Error loading leagues');
      showErrorToast('Hiba a ligák betöltése során', {
        context: 'Liga lista betöltése',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
      console.error('Error fetching leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubSubscription = async () => {
    try {
      const response = await fetch(`/api/clubs?clubId=${clubId}`);
      if (response.ok) {
        const clubData = await response.json();
        setClubSubscription(clubData.subscriptionModel || 'free');
      }
    } catch (err) {
      showErrorToast('Hiba a klub előfizetési adatok betöltése során', {
        context: 'Klub előfizetés betöltése',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
      console.error('Error fetching club subscription:', err);
    }
  };

  const checkFeatureEnabled = async () => {
    try {
      const response = await fetch(`/api/feature-flags/check?feature=leagues&clubId=${clubId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionModelEnabled(data.subscriptionModelEnabled !== false);
        return data.enabled;
      }
      return false;
    } catch (err) {
      showErrorToast('Hiba a funkció ellenőrzése során', {
        context: 'Feature flag ellenőrzése',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
      console.error('Error checking feature flag:', err);
      return false;
    }
  };

  const handleLeagueCreated = () => {
    fetchLeagues();
  };

  const handleViewLeague = (league: League) => {
    setSelectedLeague(league);
    setShowDetailModal(true);
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a ligát?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/leagues/${leagueId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccessToast('Liga sikeresen törölve!');
        fetchLeagues();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete league');
        showErrorToast(errorData.error || 'Hiba a liga törlése során', {
          context: 'Liga törlése',
          error: errorData.error,
        });
      }
    } catch (err) {
      setError('Error deleting league');
      showErrorToast('Hiba a liga törlése során', {
        context: 'Liga törlése',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
      console.error('Error deleting league:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!featureEnabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center space-y-4">
          <IconTrophy size={48} className="mx-auto text-muted-foreground/40" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground/80">Ligák funkció nem elérhető</h3>
            <p className="text-sm text-muted-foreground">
              Ez a funkció jelenleg nem engedélyezett ezen a klubon.
            </p>
          </div>
          {canManageLeagues && clubSubscription === 'free' && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  A ligák használatához prémium előfizetés szükséges.
                </AlertDescription>
              </Alert>
              <Button asChild>
                <Link href="/#pricing" className="gap-2">
                  <IconPlus className="h-4 w-4" />
                  Előfizetés frissítése
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ligák</h2>
          <p className="text-sm text-muted-foreground">
            Kövesd nyomon a versenyeidet és a játékosok pontszámait ligákon keresztül.
          </p>
        </div>
        {canCreateLeagues ? (
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <IconPlus className="h-4 w-4" />
            Új liga
          </Button>
        ) : canManageLeagues && clubSubscription === 'free' && process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED !== 'false' ? (
          <Button asChild variant="outline" className="gap-2">
            <Link href="/#pricing" title="Prémium előfizetés szükséges">
              <IconPlus className="h-4 w-4" />
              Új liga (Prémium)
            </Link>
          </Button>
        ) : null}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {leagues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <IconTrophy size={48} className="mx-auto text-muted-foreground/40" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground/80">Még nincsenek ligák</h3>
              <p className="text-sm text-muted-foreground">
                {canManageLeagues
                  ? 'Hozz létre egy új ligát a versenyeid nyomon követéséhez.'
                  : 'A klub moderátorai még nem hoztak létre ligákat.'}
              </p>
            </div>
            {canCreateLeagues ? (
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <IconPlus className="h-4 w-4" />
                Első liga létrehozása
              </Button>
            ) : canManageLeagues && clubSubscription === 'free' ? (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription>
                    A ligák létrehozásához prémium előfizetés szükséges.
                  </AlertDescription>
                </Alert>
                <Button asChild className="gap-2">
                  <Link href="/#pricing">
                    <IconPlus className="h-4 w-4" />
                    Előfizetés frissítése
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => (
            <LeagueCard
              key={league._id}
              league={league}
              canManage={canManageLeagues}
              onView={() => handleViewLeague(league)}
              onDelete={() => handleDeleteLeague(league._id!)}
              clubId={clubId}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateLeagueModal
          clubId={clubId}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onLeagueCreated={handleLeagueCreated}
        />
      )}

      {showDetailModal && selectedLeague && (
        <LeagueDetailModal
          league={selectedLeague}
          clubId={clubId}
          userRole={userRole}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLeague(null);
          }}
          onLeagueUpdated={fetchLeagues}
        />
      )}
    </div>
  );
}

interface LeagueCardProps {
  league: League;
  canManage: boolean;
  onView: () => void;
  onDelete: () => void;
  clubId: string;
}

function LeagueCard({ league, canManage, onView, onDelete, clubId }: LeagueCardProps) {
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/clubs/${clubId}?page=leagues&league=${league._id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${league.name} - Liga`,
          text: `Nézd meg ezt a ligát: ${league.name}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast('Liga link másolva a vágólapra!');
      }
    } catch (error) {
      console.error('Error sharing league:', error);
      try {
        await navigator.clipboard.writeText(shareUrl);
        showSuccessToast('Liga link másolva a vágólapra!');
      } catch (clipboardError) {
        showErrorToast('Nem sikerült másolni a linket');
        console.error('Error copying link to clipboard:', clipboardError);
      }
    }
  };

  return (
    <Card className="h-full border-0 bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight line-clamp-2">{league.name}</CardTitle>
            {league.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{league.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
              <IconShare className="h-4 w-4" />
            </Button>
            <Badge variant={league.isActive ? 'default' : 'outline'} className={cn('text-xs', league.isActive ? '' : 'bg-muted')}>
              {league.isActive ? 'Aktív' : 'Inaktív'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconUsers className="h-4 w-4" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">{league.players?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Játékosok</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
              <IconTrophy className="h-4 w-4" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">{league.attachedTournaments?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Versenyek</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button className="flex-1" onClick={onView}>
          Részletek
        </Button>
        {canManage && (
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <IconTrash className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
