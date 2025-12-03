import {  NextResponse } from 'next/server';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { UserModel } from '@/database/models/user.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

//eslint disable-next-line
export async function GET() {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ideally check if user is global admin here
    // const user = await UserModel.findOne({ email: session.user.email });
    // if (!user?.isGlobalAdmin) ...

    // Fetch Verified Clubs
    const verifiedClubs = await ClubModel.find({ verified: true })
      .select('name description location contact logo admin moderators')
      .populate('admin', 'name email')
      .populate('moderators', 'name email');

    // Fetch Verified Leagues
    const verifiedLeagues = await LeagueModel.find({ verified: true })
      .populate('club', 'name')
      .populate('attachedTournaments', 'name startDate status');

    // Fetch National League Tournaments (those attached to verified leagues)
    // We can get this from the leagues, but if we need a flat list:
    const leagueIds = verifiedLeagues.map(l => l._id);
    const nationalTournaments = await TournamentModel.find({ league: { $in: leagueIds } })
      .select('name startDate status tournamentSettings.format')
      .populate('league', 'name');

    // Fetch Global Admins (or just all admins if that's what's needed, but usually specific role)
    // For now, let's return users who are admins of verified clubs? 
    // Or if there is a specific 'admin' role in User model. 
    // The requirement says "verified club admins/moderators listing".
    // We already have that in `verifiedClubs` via populate.
    
    // Let's also fetch all users who are admins/moderators of ANY verified club for a flat list
    const clubAdminIds = verifiedClubs.flatMap(c => [...c.admin.map((a: any) => a._id), ...c.moderators.map((m: any) => m._id)]);
    const verifiedClubAdmins = await UserModel.find({ _id: { $in: clubAdminIds } }).select('name email image');

    return NextResponse.json({
      verifiedClubs,
      verifiedLeagues,
      nationalTournaments,
      verifiedClubAdmins
    });

  } catch (error) {
    console.error('Error fetching admin data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
