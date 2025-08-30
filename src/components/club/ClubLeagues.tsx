'use client';

import React, { useState, useEffect } from 'react';
import { useUserContext } from '@/hooks/useUser';
import { FeatureFlagService } from '@/lib/featureFlags';
import LeagueManager from '@/components/admin/LeagueManager';
import LeagueStandings from '@/components/admin/LeagueStandings';

interface ClubLeaguesProps {
  clubId: string;
  clubName: string;
}

export default function ClubLeagues({ clubId, clubName }: ClubLeaguesProps) {
  const { user } = useUserContext();
  const [isLeagueEnabled, setIsLeagueEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // Feature flag ellenőrzése
  useEffect(() => {
    const checkLeagueFeature = async () => {
      try {
        const enabled = await FeatureFlagService.isLeagueSystemEnabled(clubId);
        setIsLeagueEnabled(enabled);
      } catch (error) {
        console.error('Error checking league feature:', error);
        setIsLeagueEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkLeagueFeature();
  }, [clubId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!isLeagueEnabled) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-base-content mb-4">Liga Rendszer</h2>
        <p className="text-base-content/70 mb-6 max-w-md mx-auto">
          A liga rendszer jelenleg nem elérhető ebben a klubban. 
          Ez a funkció csak premium előfizetéssel érhető el.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button className="btn btn-primary">
            Premium Előfizetés
          </button>
          <button className="btn btn-outline">
            További Információk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {clubName} Ligák
          </h1>
          <p className="text-base-content/70 mt-2">
            Kezelj versenyzőket és kövesd nyomon a teljesítményüket
          </p>
        </div>
      </div>

      {/* Liga kezelés */}
      <LeagueManager clubId={clubId} />

      {/* Liga állás megjelenítés - ha van kiválasztott liga */}
      {selectedLeague && (
        <LeagueStandings 
          leagueId={selectedLeague} 
          leagueName="Kiválasztott Liga" // TODO: Liga neve lekérdezése
        />
      )}
    </div>
  );
}
