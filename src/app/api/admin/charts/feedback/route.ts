import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get feedback data for the last 12 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const months = [];
    const data = [];

    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(startDate);
      monthStart.setMonth(monthStart.getMonth() + i);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthName = monthStart.toLocaleDateString('hu-HU', { month: 'short' });
      months.push(monthName);

      // Mock data for now - replace with actual database query
      const count = Math.floor(Math.random() * 20) + 1; // Random number between 1-20
      data.push(count);
    }

    return NextResponse.json({
      labels: months,
      datasets: [{
        label: 'Visszajelzések',
        data: data,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)'
      }]
    });
  } catch (error) {
    console.error('Error fetching feedback chart data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
