"use client";

import { useState, useEffect } from 'react';
import LiveMatchViewer from '@/components/tournament/LiveMatchViewer';
import LiveMatchesList from '@/components/tournament/LiveMatchesList';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const LiveStreamingPage = () => {
  const { code } = useParams();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showMatchList, setShowMatchList] = useState<boolean>(true);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const response = await fetch(`/api/tournaments/${code}`);
        const data = await response.json();
        
        if (data && data.clubId) {
          // Check feature flag or subscription
          // Assuming featureFlags are populated on clubId
          const hasAccess = data.clubId.featureFlags?.liveMatchFollowing || 
                           ['pro', 'enterprise'].includes(data.clubId.subscriptionModel);
          setIsAllowed(!!hasAccess);
        } else {
          setIsAllowed(false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setIsAllowed(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      checkPermission();
    }
  }, [code]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-base-100 via-base-200 to-base-300 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (isAllowed === false) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-base-100 via-base-200 to-base-300 flex items-center justify-center p-4">
        <div className="glass-card max-w-md text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-base-content">Hozzáférés Megtagadva</h2>
          <p className="text-base-content/70 mb-6">
            Ez a funkció csak a Pro és Enterprise csomagokban érhető el. Kérjük, lépj kapcsolatba a klub adminisztrátorával.
          </p>
          <Link href="/" className="btn btn-primary">Vissza a főoldalra</Link>
        </div>
      </div>
    );
  }

  if (!selectedMatchId) {
    console.log("No match selected");
  }

  const handleMatchSelect = (matchId: string, match: any) => {
    setSelectedMatchId(matchId);
    setSelectedMatch(match);
    setShowMatchList(false); // Hide match list when match is selected
  };

  const handleBackToMatches = () => {
    setShowMatchList(true);
    setSelectedMatchId(null);
    setSelectedMatch(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-base-100 via-base-200 to-base-300">



      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2 text-base-content">
           Élő Meccsek Követése
          </h2>
          <p className="text-base-content/70">
            Kövesd a meccseket dobásonkénti frissítésekkel
          </p>
        </div>
        
        {showMatchList ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Matches List */}
            <div className="glass-card">
              <LiveMatchesList 
                tournamentCode={code as string} 
                onMatchSelect={handleMatchSelect}
                selectedMatchId={selectedMatchId}
              />
            </div>
            
            {/* Live Match Viewer */}
            <div className="glass-card">
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-base-content">Élő Meccs Követő</h3>
                  <p className="text-base-content/70 mb-6">
                    Válassz ki egy meccset a bal oldali listából a követés megkezdéséhez.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-success">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span>Socket kapcsolat aktív</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card">
            {/* Back to matches button */}
            <div className="flex justify-start mb-4">
              <button
                className="btn btn-sm btn-outline"
                onClick={handleBackToMatches}
              >
                ← Vissza a meccsekhez
              </button>
            </div>
            
            {/* Live Match Viewer */}
            {selectedMatch && (
              <LiveMatchViewer
                onBack={handleBackToMatches}
                matchId={selectedMatch._id}
                tournamentCode={code as string}
                player1={selectedMatch.player1}
                player2={selectedMatch.player2}
              />
            )}
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-8 glass-card">
          <h2 className="text-xl font-bold mb-4 text-center text-base-content">Használati útmutató</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <p className="text-base-content/80">Nyisd meg egy másik böngészőablakot a MatchGame oldalon</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <p className="text-base-content/80">Kezdj el játszani egy meccset</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <p className="text-base-content/80">Ezen az oldalon követheted a dobásokat real-time</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                4
              </div>
              <p className="text-base-content/80">A Socket.IO kapcsolat állapota a zöld/piros pont jelzi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamingPage; 