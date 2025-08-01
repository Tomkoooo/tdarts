"use client";

import { useState } from 'react';
import LiveMatchViewer from '@/components/tournament/LiveMatchViewer';
import LiveMatchesList from '@/components/tournament/LiveMatchesList';
import { useParams } from 'next/navigation';

const LiveStreamingPage = () => {
  const { code } = useParams();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  console.log(selectedMatchId);
  const handleMatchSelect = (matchId: string, match: any) => {
    setSelectedMatchId(matchId);
    setSelectedMatch(match);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Élő Közvetítés</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Matches List */}
        <div>
          <LiveMatchesList 
            tournamentCode={code as string} 
            onMatchSelect={handleMatchSelect} 
          />
        </div>
        
        {/* Live Match Viewer */}
        <div>
          {selectedMatch ? (
            <LiveMatchViewer
              matchId={selectedMatch._id}
              tournamentCode={code as string}
              player1={selectedMatch.player1}
              player2={selectedMatch.player2}
            />
          ) : (
            <div className="bg-base-100 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Élő Meccs Követő</h3>
              <p className="text-base-content/70">
                Válassz ki egy meccset a bal oldali listából a követés megkezdéséhez.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-8 bg-base-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Használati útmutató</h2>
        <div className="space-y-2 text-sm">
          <p>1. Nyisd meg egy másik böngészőablakot a MatchGame oldalon</p>
          <p>2. Kezdj el játszani egy meccset</p>
          <p>3. Ezen az oldalon követheted a dobásokat real-time</p>
          <p>4. A Socket.IO kapcsolat állapota a zöld/piros pont jelzi</p>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamingPage; 