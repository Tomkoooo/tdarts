import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

export const GET = withApiTelemetry('/api/admin/charts/tournaments', async (_request: NextRequest) => {
  void _request;
  try {
    await connectMongo();
    
    // Get data for the last 12 months
    const months = [];
    const allData = [];
    const verifiedData = [];
    const unverifiedData = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthName = date.toLocaleDateString('hu-HU', { month: 'short' });
      months.push(monthName);
      
      // Total count
      const totalCount = await TournamentModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: { $ne: true },
        isActive: { $ne: false }
      });
      
      // Verified count (via aggregation to check league)
      const verifiedResult = await TournamentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            isDeleted: { $ne: true },
            isActive: { $ne: false }
          }
        },
        {
          $lookup: {
            from: 'leagues',
            localField: 'league',
            foreignField: '_id',
            as: 'leagueInfo'
          }
        },
        {
          $match: {
            'leagueInfo.verified': true
          }
        },
        {
          $count: 'count'
        }
      ]);
      
      const verifiedCount = verifiedResult.length > 0 ? verifiedResult[0].count : 0;
      const unverifiedCount = totalCount - verifiedCount;
      
      allData.push(totalCount);
      verifiedData.push(verifiedCount);
      unverifiedData.push(unverifiedCount);
    }

    const chartData = {
      labels: months,
      datasets: [
        {
          label: 'Összes Verseny',
          data: allData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)'
        },
        {
          label: 'OAC Versenyek',
          data: verifiedData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)'
        },
        {
          label: 'Platform Versenyek',
          data: unverifiedData,
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          borderColor: 'rgba(156, 163, 175, 1)'
        }
      ]
    };

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error fetching tournament chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
});
