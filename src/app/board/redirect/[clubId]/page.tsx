//server side component that will get the club latest tournament and redirect it
import { TournamentService } from "@/database/services/tournament.service";
import { notFound, redirect } from "next/navigation";

export default async function ClubBoardPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const latestTournament = await TournamentService.getLatestTournamentByClubId(clubId);
  if (!latestTournament) {  
    return notFound();
  }
  return redirect(`/board/${latestTournament.tournamentId}`);
}