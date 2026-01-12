import { redirect } from 'next/navigation';
import { FeatureFlagService } from '@/lib/featureFlags';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconAlertTriangle, IconHome, IconMail } from '@tabler/icons-react';
import Link from 'next/link';

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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md w-full shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconAlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              </div>
              <CardTitle className="text-xl">Élő Meccs Követés Nem Elérhető</CardTitle>
              <CardDescription>
                Ez a klub jelenleg nem rendelkezik élő meccs követési funkcióval. 
                A funkció használatához pro előfizetés szükséges.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Pro Előfizetés Előnyei:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 text-left">
                  <li>• Élő meccs követés real-time</li>
                  <li>• Dobásonkénti statisztikák</li>
                  <li>• Speciális elemző eszközök</li>
                  <li>• Részletes játékos adatok</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link href={`/tournaments/${code}`}>
                    <IconHome className="w-4 h-4 mr-2" />
                    Vissza a Tornához
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/contact">
                    <IconMail className="w-4 h-4 mr-2" />
                    Kapcsolat
                  </Link>
                </Button>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground text-center">
                  Ha már pro előfizető vagy, de továbbra is ezt az üzenetet látod, 
                  kérjük vedd fel a kapcsolatot az adminisztrátorral.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // If socket feature is enabled, render the normal live page
    return <>{children}</>;

  } catch (error) {
    console.error('Error in live layout:', error);
    
    // Fallback error page
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-lg border-destructive/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconAlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Hiba Történt</CardTitle>
            <CardDescription>
              Nem sikerült betölteni az élő követési oldalt. 
              Kérjük próbáld újra később.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href={`/tournaments/${code}`}>
                Vissza a Tornához
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}