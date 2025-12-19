import { NextRequest, NextResponse } from 'next/server';
import { ClubModel } from '@/database/models/club.model';
import { connectMongo } from '@/lib/mongoose';
import { validateInternalSecret, unauthorizedResponse } from '@/lib/api-auth.middleware';

export async function GET(req: NextRequest) {
  try {
    // Validate internal secret
    if (!validateInternalSecret(req)) {
      return unauthorizedResponse();
    }

    await connectMongo();
    
    const clubs = await ClubModel.find({ isActive: true, verified: true })
      .select('name description location logo verified createdAt')
      .lean();

    // Add member count
    const clubsWithCounts = clubs.map(club => ({
      ...club,
      memberCount: club.members?.length || 0,
    }));

    return NextResponse.json({
      clubs: clubsWithCounts,
      total: clubsWithCounts.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching verified clubs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
