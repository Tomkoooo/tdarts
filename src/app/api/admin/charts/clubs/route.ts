import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Get data for the last 6 months
    const months = [];
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthName = date.toLocaleDateString('hu-HU', { month: 'short' });
      months.push(monthName);
      
      const count = await ClubModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: { $ne: true }
      });
      
      data.push(count);
    }

    const chartData = {
      labels: months,
      datasets: [{
        label: 'Új Klubok',
        data: data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)'
      }]
    };

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error fetching club chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
