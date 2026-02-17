"use client";

import { useState, useEffect, Suspense } from 'react';
import LiveMatchViewer from '@/components/tournament/LiveMatchViewer';
import LiveMatchesList from '@/components/tournament/LiveMatchesList';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { IconShare, IconDeviceTv, IconArrowLeft } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const LiveStreamingContent = () => {
  const { code } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check valid matchId from URL on mount
  useEffect(() => {
    const matchId = searchParams.get('matchId');
    if (matchId) {
      setSelectedMatchId(matchId);
    }
  }, [searchParams]);

  // Handle mobile responsiveness check
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMatchSelect = (matchId: string, match: any) => {
    setSelectedMatchId(matchId);
    setSelectedMatch(match);
    
    // Update URL without full reload
    const newParams = new URLSearchParams(searchParams);
    newParams.set('matchId', matchId);
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const handleBackToMatches = () => {
    setSelectedMatchId(null);
    setSelectedMatch(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('matchId');
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link másolva a vágólapra!');
    } catch (err) {
      toast.error('Nem sikerült másolni a linket.');
      console.log(err)
    }
  };

  // Logic: Show main header ONLY if (Desktop) OR (Mobile AND No Match Selected)
  // This hides the top header when viewing a match on mobile, letting the specific match viewer header take over.
  const showMainHeader = !isMobileView || !selectedMatchId;

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* Global Header */}
      {showMainHeader && (
        <div className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Link href={`/tournaments/${code}`} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted">
                <IconArrowLeft className="w-5 h-5" />
               </Link>
               <div>
                 <h1 className="text-lg font-bold flex items-center gap-2">
                   <IconDeviceTv className="w-5 h-5 text-primary" />
                   tDarts Live
                 </h1>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Desktop Share Button */}
              {selectedMatchId && !isMobileView && (
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  <IconShare className="w-4 h-4" />
                  <span>Megosztás</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`container mx-auto ${isMobileView ? (selectedMatchId ? 'p-0' : 'p-4') : 'p-6'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)]">
          
          {/* Matches List: Visible on Desktop, OR Mobile when no match selected */}
          {(!selectedMatchId || !isMobileView) && (
            <div className={`col-span-1 lg:col-span-4 h-full overflow-hidden ${selectedMatchId && !isMobileView ? 'hidden lg:block' : ''}`}>
               <LiveMatchesList 
                 tournamentCode={code as string} 
                 onMatchSelect={handleMatchSelect} 
                 selectedMatchId={selectedMatchId}
               />
            </div>
          )}
          
          {/* Match Viewer: Visible when match selected */}
          {selectedMatchId ? (
            <div className="col-span-1 lg:col-span-8 h-full overflow-y-auto">
              <LiveMatchViewer
                matchId={selectedMatchId}
                tournamentCode={code as string}
                player1={selectedMatch?.player1}
                player2={selectedMatch?.player2}
                onBack={handleBackToMatches}
                onShare={handleShare}
              />
            </div>
          ) : (
             /* Desktop Placeholder */
            <div className="hidden lg:flex col-span-8 bg-muted/10 border-2 border-dashed border-muted rounded-xl items-center justify-center flex-col text-muted-foreground gap-4">
               <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                 <IconDeviceTv className="w-10 h-10 opacity-40" />
               </div>
               <div className="text-center">
                 <h3 className="font-semibold text-lg">Válassz egy meccset</h3>
                 <p className="text-sm opacity-70">A bal oldali listából választhatsz.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function LiveStreamingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading loading-spinner text-primary"></div>
      </div>
    }>
      <LiveStreamingContent />
    </Suspense>
  );
}