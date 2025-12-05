import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LeagueModel } from '@/database/models/league.model';

export async function GET() {
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
      const totalCount = await LeagueModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isActive: { $ne: false }
      });
      
      // Verified count
      const verifiedCount = await LeagueModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isActive: { $ne: false },
        verified: true
      });
      
      // Unverified count
      const unverifiedCount = totalCount - verifiedCount;
      
      allData.push(totalCount);
      verifiedData.push(verifiedCount);
      unverifiedData.push(unverifiedCount);
    }

    const chartData = {
      labels: months,
      datasets: [
        {
          label: 'Összes Liga',
          data: allData,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgba(245, 158, 11, 1)'
        },
        {
          label: 'OAC Ligák',
          data: verifiedData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)'
        },
        {
          label: 'Platform Ligák',
          data: unverifiedData,
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          borderColor: 'rgba(156, 163, 175, 1)'
        }
      ]
    };

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error fetching league chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
