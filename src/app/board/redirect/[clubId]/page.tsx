//server side component that will get the club active tournaments and show selection or redirect
import { TournamentService } from "@/database/services/tournament.service";
import { notFound, redirect } from "next/navigation";
import TournamentSelectionPage from "./TournamentSelectionPage";

export default async function ClubBoardPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const activeTournaments = await TournamentService.getActiveTournamentsByClubId(clubId);
  
  if (!activeTournaments || activeTournaments.length === 0) {  
    return notFound();
  }

  // If only one tournament, redirect directly
  if (activeTournaments.length === 1) {
    return redirect(`/board/${activeTournaments[0].tournamentId}`);
  }

  // If multiple tournaments, show selection page
  return <TournamentSelectionPage tournaments={activeTournaments} clubId={clubId} />;
}