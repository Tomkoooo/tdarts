import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

export const GET = withApiTelemetry('/api/admin/charts/users', async (_request: NextRequest) => {
  void _request;
  try {
    await connectMongo();
    
    // Get data for the last 12 months
    const months = [];
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthName = date.toLocaleDateString('hu-HU', { month: 'short' });
      months.push(monthName);
      
      const count = await UserModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      console.log(`User chart - ${monthName}: ${count} users (${startOfMonth.toISOString()} to ${endOfMonth.toISOString()})`);
      data.push(count);
    }

    const chartData = {
      labels: months,
      datasets: [{
        label: 'Új Felhasználók',
        data: data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)'
      }]
    };

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error fetching user chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
});
