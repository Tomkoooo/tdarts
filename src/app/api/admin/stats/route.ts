import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { LogModel } from '@/database/models/log.model';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Get current date and previous month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Fetch all statistics in parallel
    const [
      totalUsers,
      totalClubs,
      totalTournaments,
      totalErrors,
      newUsersThisMonth,
      newClubsThisMonth,
      newTournamentsThisMonth,
      errorsThisMonth,
      newUsersPreviousMonth,
      newClubsPreviousMonth,
      newTournamentsPreviousMonth,
      errorsPreviousMonth
    ] = await Promise.all([
      UserModel.countDocuments(),
      ClubModel.countDocuments({ isDeleted: { $ne: true } }),
      TournamentModel.countDocuments({ isDeleted: { $ne: true } }),
      LogModel.countDocuments({ level: 'error' }),
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
      })
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
      newUsersThisMonth,
      newClubsThisMonth,
      newTournamentsThisMonth,
      errorsThisMonth,
      userGrowth: calculateGrowth(newUsersThisMonth, newUsersPreviousMonth),
      clubGrowth: calculateGrowth(newClubsThisMonth, newClubsPreviousMonth),
      tournamentGrowth: calculateGrowth(newTournamentsThisMonth, newTournamentsPreviousMonth),
      errorGrowth: calculateGrowth(errorsThisMonth, errorsPreviousMonth)
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
