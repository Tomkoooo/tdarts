import { redirect } from 'next/navigation';
import { TournamentService } from '@/database/services/tournament.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';

interface LiveLayoutProps {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}

export default async function LiveLayout({ children, params }: LiveLayoutProps) {
  const { code } = await params;

  try {
    // Connect to database
    await connectMongo();

    // Get tournament data to find clubId
    const tournament = await TournamentModel.findOne({ tournamentId: code });
    if (!tournament) {
      redirect('/tournaments');
    }

    const clubId = tournament.clubId.toString();

    // Check if socket feature is enabled for this club
    const isSocketEnabled = await FeatureFlagService.isSocketEnabled(clubId);

    if (!isSocketEnabled) {
      // Return static page for clubs without live match following
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-base-200 rounded-2xl p-8 shadow-xl text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-warning-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-base-content mb-2">
                Élő Meccs Követés Nem Elérhető
              </h1>
              <p className="text-base-content/70 mb-6">
                Ez a klub jelenleg nem rendelkezik élő meccs követési funkcióval. 
                A funkció használatához pro előfizetés szükséges.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-base-100 p-4 rounded-lg">
                <h3 className="font-semibold text-base-content mb-2">Pro Előfizetés Előnyei:</h3>
                <ul className="text-sm text-base-content/70 space-y-1 text-left">
                  <li>• Élő meccs követés real-time</li>
                  <li>• Dobásonkénti statisztikák</li>
                  <li>• Speciális elemző eszközök</li>
                  <li>• Részletes játékos adatok</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <a 
                  href={`/tournaments/${code}`}
                  className="btn btn-primary flex-1"
                >
                  Vissza a Tornához
                </a>
                <a 
                  href="/contact"
                  className="btn btn-outline flex-1"
                >
                  Kapcsolat
                </a>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-base-300">
              <p className="text-xs text-base-content/50">
                Ha már pro előfizető vagy, de továbbra is ezt az üzenetet látod, 
                kérjük vedd fel a kapcsolatot az adminisztrátorral.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // If socket feature is enabled, render the normal live page
    return <>{children}</>;

  } catch (error) {
    console.error('Error in live layout:', error);
    
    // Fallback error page
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-base-200 rounded-2xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-error rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-error-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-2">
            Hiba Történt
          </h1>
          <p className="text-base-content/70 mb-6">
            Nem sikerült betölteni az élő követési oldalt. 
            Kérjük próbáld újra később.
          </p>
          
          <a 
            href={`/tournaments/${code}`}
            className="btn btn-primary"
          >
            Vissza a Tornához
          </a>
        </div>
      </div>
    );
  }
} 