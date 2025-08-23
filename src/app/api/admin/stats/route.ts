import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { LogModel } from '@/database/models/log.model';
import { FeedbackModel } from '@/database/models/feedback.model';

export async function GET() {
  try {
    await connectMongo();
    
    // Get current date and previous month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

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
      feedbackPreviousMonth
    ] = await Promise.all([
      UserModel.countDocuments(),
      ClubModel.countDocuments({ isDeleted: { $ne: true } }),
      TournamentModel.countDocuments({ isDeleted: { $ne: true } }),
      LogModel.countDocuments({ level: 'error' }),
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
        timestamp: { $gte: currentMonth }
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
        timestamp: { $gte: previousMonth, $lt: currentMonth }
      }),
      FeedbackModel.countDocuments({ createdAt: { $gte: previousMonth, $lt: currentMonth } })
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
      feedbackGrowth: calculateGrowth(feedbackThisMonth, feedbackPreviousMonth)
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
