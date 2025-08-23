import { NextRequest, NextResponse } from 'next/server';
import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    // Admin jogosultság ellenőrzése
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectMongo();

    // Az előző 30 nap adatai
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // Nap végéig
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0); // Nap elejétől

    const dailyStats = await TournamentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isActive: { $ne: false }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Kitöltjük a hiányzó napokat 0 értékkel
    const filledStats = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingStat = dailyStats.find(stat => stat._id === dateString);
      
      filledStats.push({
        date: dateString,
        count: existingStat ? existingStat.count : 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      success: true,
      data: filledStats
    });
  } catch (error) {
    console.error('Error fetching daily tournament stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
