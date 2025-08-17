import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify admin access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get error statistics
    const [totalErrors, errorsByCategory, errorsByLevel, recentErrors] = await Promise.all([
      LogModel.countDocuments({ level: 'error' }),
      LogModel.aggregate([
        { $match: { level: 'error' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      LogModel.aggregate([
        { $match: { level: 'error' } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      LogModel.find({ level: 'error' })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    ]);

    const stats = {
      totalErrors,
      errorsByCategory: errorsByCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      errorsByLevel: errorsByLevel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentErrors
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching error stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error statistics' },
      { status: 500 }
    );
  }
}
