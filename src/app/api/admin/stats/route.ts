import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { LogModel } from '@/database/models/log.model';
import { FeedbackModel } from '@/database/models/feedback.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

function buildStructuredMatcher() {
  return [
    { errorCode: { $exists: true, $nin: [null, ''] } },
    { operation: { $exists: true, $nin: [null, ''] } },
    { requestId: { $exists: true, $nin: [null, ''] } },
    { errorType: { $exists: true, $nin: [null, ''] } },
    { expected: { $exists: true } },
  ];
}

export const GET = withApiTelemetry('/api/admin/stats', async (request: NextRequest) => {
  try {
    await connectMongo();
    
    // Standard Admin Auth (Cookie -> JWT -> DB)
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id).select('isAdmin');
      
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
       console.error('Invalid token:', error);
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get current date and previous month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const structuredMatcher = buildStructuredMatcher();

    // Fetch all statistics in parallel
    const [
      totalUsers,
      totalClubs,
      totalTournaments,
      totalErrors,
      totalFeedback,
      newUsersThisMonth,
      newClubsThisMonth,
      newTournamentsThisMonth,
      errorsThisMonth,
      feedbackThisMonth,
      newUsersPreviousMonth,
      newClubsPreviousMonth,
      newTournamentsPreviousMonth,
      errorsPreviousMonth,
      feedbackPreviousMonth,
      newUsersLast24h,
      newClubsLast24h,
      newTournamentsLast24h,
      errorsLast24h,
      feedbackLast24h
    ] = await Promise.all([
      UserModel.countDocuments(),
      ClubModel.countDocuments({ isDeleted: { $ne: true } }),
      TournamentModel.countDocuments({ isDeleted: { $ne: true } }),
      LogModel.countDocuments({ level: 'error', category: { $ne: 'auth' }, $or: structuredMatcher }),
      FeedbackModel.countDocuments(),
      UserModel.countDocuments({ createdAt: { $gte: currentMonth } }),
      ClubModel.countDocuments({ 
        createdAt: { $gte: currentMonth },
        isDeleted: { $ne: true }
      }),
      TournamentModel.countDocuments({ 
        createdAt: { $gte: currentMonth },
        isDeleted: { $ne: true }
      }),
      LogModel.countDocuments({ 
        level: 'error',
        category: { $ne: 'auth' },
        timestamp: { $gte: currentMonth },
        $or: structuredMatcher,
      }),
      FeedbackModel.countDocuments({ createdAt: { $gte: currentMonth } }),
      UserModel.countDocuments({ createdAt: { $gte: previousMonth, $lt: currentMonth } }),
      ClubModel.countDocuments({ 
        createdAt: { $gte: previousMonth, $lt: currentMonth },
        isDeleted: { $ne: true }
      }),
      TournamentModel.countDocuments({ 
        createdAt: { $gte: previousMonth, $lt: currentMonth },
        isDeleted: { $ne: true }
      }),
      LogModel.countDocuments({ 
        level: 'error',
        category: { $ne: 'auth' },
        timestamp: { $gte: previousMonth, $lt: currentMonth },
        $or: structuredMatcher,
      }),
      FeedbackModel.countDocuments({ createdAt: { $gte: previousMonth, $lt: currentMonth } }),
      UserModel.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      ClubModel.countDocuments({ 
        createdAt: { $gte: twentyFourHoursAgo },
        isDeleted: { $ne: true }
      }),
      TournamentModel.countDocuments({ 
        createdAt: { $gte: twentyFourHoursAgo },
        isDeleted: { $ne: true }
      }),
      LogModel.countDocuments({ 
        level: 'error',
        category: { $ne: 'auth' },
        timestamp: { $gte: twentyFourHoursAgo },
        $or: structuredMatcher,
      }),
      FeedbackModel.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } })
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const stats = {
      totalUsers,
      totalClubs,
      totalTournaments,
      totalErrors,
      totalFeedback,
      newUsersThisMonth,
      newClubsThisMonth,
      newTournamentsThisMonth,
      errorsThisMonth,
      feedbackThisMonth,
      userGrowth: calculateGrowth(newUsersThisMonth, newUsersPreviousMonth),
      clubGrowth: calculateGrowth(newClubsThisMonth, newClubsPreviousMonth),
      tournamentGrowth: calculateGrowth(newTournamentsThisMonth, newTournamentsPreviousMonth),
      errorGrowth: calculateGrowth(errorsThisMonth, errorsPreviousMonth),
      feedbackGrowth: calculateGrowth(feedbackThisMonth, feedbackPreviousMonth),
      newUsersLast24h,
      newClubsLast24h,
      newTournamentsLast24h,
      errorsLast24h,
      feedbackLast24h
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
});
