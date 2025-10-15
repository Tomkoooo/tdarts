'use client';
import React, { useState, useEffect } from 'react';
import { IconPlus, IconTrophy, IconUsers, IconTrash, IconShare } from '@tabler/icons-react';
import { League } from '@/interface/league.interface';
import CreateLeagueModal from './CreateLeagueModal';
import LeagueDetailModal from './LeagueDetailModal';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import Link from 'next/link';

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
  // Allow league creation if:
  // 1. Feature is enabled AND
  // 2. User has permissions AND
  // 3. Either subscription model is disabled OR club has premium subscription
  const canCreateLeagues = canManageLeagues && featureEnabled && (
    !subscriptionModelEnabled || 
    clubSubscription !== 'free'
  );

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
        
        // Auto-open league if specified in URL
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
        error: err instanceof Error ? err.message : 'Ismeretlen hiba'
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
        error: err instanceof Error ? err.message : 'Ismeretlen hiba'
      });
      console.error('Error fetching club subscription:', err);
    }
  };

  const checkFeatureEnabled = async () => {
    try {
      const response = await fetch(`/api/feature-flags/check?feature=leagues&clubId=${clubId}`);
      if (response.ok) {
        const data = await response.json();
        // Also check if subscription model is enabled
        setSubscriptionModelEnabled(data.subscriptionModelEnabled !== false);
        return data.enabled;
      }
      return false;
    } catch (err) {
      showErrorToast('Hiba a funkció ellenőrzése során', {
        context: 'Feature flag ellenőrzése',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba'
      });
      console.error('Error checking feature flag:', err);
      return false;
    }
  };

  const handleLeagueCreated = () => {
    setShowCreateModal(false);
    fetchLeagues();
  };

  const handleViewLeague = (league: League) => {
    setSelectedLeague(league);
    setShowDetailModal(true);
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues/${leagueId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLeagues();
        showSuccessToast('Liga sikeresen törölve!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete league');
        showErrorToast(errorData.error || 'Hiba a liga törlése során', {
          context: 'Liga törlése',
          error: errorData.error
        });
      }
    } catch (err) {
      setError('Error deleting league');
      showErrorToast('Hiba a liga törlése során', {
        context: 'Liga törlése',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba'
      });
      console.error('Error deleting league:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // If feature is not enabled, show disabled message
  if (!featureEnabled) {
    return (
      <div className="text-center py-12">
        <IconTrophy size={64} className="mx-auto text-base-content/20 mb-4" />
        <h3 className="text-lg font-medium text-base-content/60 mb-2">
          Ligák funkció nem elérhető
        </h3>
        <p className="text-base-content/40 mb-4">
          Ez a funkció jelenleg nem engedélyezett ezen a klubon.
        </p>
        {canManageLeagues && clubSubscription === 'free' && (
          <div className="space-y-4">
            <div className="alert alert-info max-w-md mx-auto">
              <span>A ligák használatához prémium előfizetés szükséges.</span>
            </div>
            <Link
              href="/#pricing"
              className="btn btn-primary gap-2"
            >
              <IconPlus className="w-4 h-4" />
              Előfizetés Frissítése
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-base-content">Ligák</h2>
        </div>
        {canCreateLeagues ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary gap-2"
          >
            <IconPlus className="w-4 h-4" />
            Új Liga
          </button>
        ) : canManageLeagues && clubSubscription === 'free' && process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED !== 'false' ? (
          <Link
            href="/#pricing"
            className="btn btn-outline btn-primary gap-2"
            title="Prémium előfizetés szükséges"
          >
            <IconPlus className="w-4 h-4" />
            Új Liga (Prémium)
          </Link>
        ) : null}
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Leagues Grid */}
      {leagues.length === 0 ? (
        <div className="text-center py-12">
          <IconTrophy size={64} className="mx-auto text-base-content/20 mb-4" />
          <h3 className="text-lg font-medium text-base-content/60 mb-2">
            Még nincsenek ligák
          </h3>
          <p className="text-base-content/40 mb-4">
            {canManageLeagues 
              ? 'Hozz létre egy új ligát a versenyeid nyomon követéséhez'
              : 'A klub moderátorai még nem hoztak létre ligákat'
            }
          </p>
          {canCreateLeagues ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary gap-2"
            >
              <IconPlus size={18} />
              Első Liga Létrehozása
            </button>
          ) : canManageLeagues && clubSubscription === 'free' ? (
            <div className="space-y-4">
              <div className="alert alert-info">
                <span>A ligák létrehozásához prémium előfizetés szükséges.</span>
              </div>
              <Link
                href="/#pricing"
                className="btn btn-primary gap-2"
              >
                <IconPlus size={18} />
                Előfizetés Frissítése
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Modals */}
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
      // Fallback: copy to clipboard
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
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="card-title text-lg mb-2">{league.name}</h3>
            {league.description && (
              <p className="text-base-content/60 text-sm mb-3 line-clamp-2">
                {league.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="btn btn-ghost btn-xs"
              title="Liga megosztása"
            >
              <IconShare size={14} />
            </button>
            <div className={`badge ${league.isActive ? 'badge-success' : 'badge-error'}`}>
              {league.isActive ? 'Aktív' : 'Inaktív'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="stat">
            <div className="stat-figure text-primary">
              <IconUsers size={20} />
            </div>
            <div className="stat-value text-sm">
              {league.players?.length || 0}
            </div>
            <div className="stat-desc">Játékosok</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-secondary">
              <IconTrophy size={20} />
            </div>
            <div className="stat-value text-sm">
              {league.attachedTournaments?.length || 0}
            </div>
            <div className="stat-desc">Versenyek</div>
          </div>
        </div>

        <div className="card-actions justify-between">
          <button
            onClick={onView}
            className="btn btn-primary btn-sm flex-1"
          >
            Részletek
          </button>
          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={onDelete}
                className="btn btn-error btn-sm"
                title="Liga törlése"
              >
                <IconTrash size={16}/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
