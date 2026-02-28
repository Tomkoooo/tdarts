import { NextResponse } from 'next/server';
import {connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET() {
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
      const totalCount = await ClubModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isActive: { $ne: false }
      });
      
      // Verified count
      const verifiedCount = await ClubModel.countDocuments({
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
          label: 'Összes Klub',
          data: allData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)'
        },
        {
          label: 'OAC Klubok',
          data: verifiedData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)'
        },
        {
          label: 'Platform Klubok',
          data: unverifiedData,
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          borderColor: 'rgba(156, 163, 175, 1)'
        }
      ]
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

export const GET = withApiTelemetry('/api/admin/charts/clubs', __GET as any);
