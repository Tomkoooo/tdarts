
import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { FeedbackModel } from '@/database/models/feedback.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

function buildStructuredMatcher() {
  return [
    { errorCode: { $exists: true, $nin: [null, ''] } },
    { operation: { $exists: true, $nin: [null, ''] } },
    { requestId: { $exists: true, $nin: [null, ''] } },
    { errorType: { $exists: true, $nin: [null, ''] } },
    { expected: { $exists: true } },
  ];
}

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Standard Admin Auth (Cookie -> JWT -> DB)
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id).select('isAdmin');
      
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
       console.error('Invalid token:', error);
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Summarize events from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const structuredMatcher = buildStructuredMatcher();

    const [
      newUsers,
      newClubs,
      newTournaments,
      newFeedback,
      errorCount,
      clubRegs
    ] = await Promise.all([
      UserModel.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      ClubModel.countDocuments({ createdAt: { $gte: oneDayAgo }, isDeleted: { $ne: true } }),
      TournamentModel.countDocuments({ createdAt: { $gte: oneDayAgo }, isDeleted: { $ne: true } }),
      FeedbackModel.find({ createdAt: { $gte: oneDayAgo } }).select('message userId').populate('userId', 'name'),
      LogModel.countDocuments({
        level: 'error',
        category: { $ne: 'auth' },
        expected: { $ne: true },
        timestamp: { $gte: oneDayAgo },
        $or: structuredMatcher,
      }),
      // For specific club names if needed, or just count. User asked for "REMZ events and 10 other clubs". 
      // Let's get a few club names.
      ClubModel.find({ createdAt: { $gte: oneDayAgo }, isDeleted: { $ne: true } }).select('name').limit(3)
    ]);

    const activities: { id: string, type: string, message: string, time: string, timestamp: Date }[] = [];
    const now = new Date();

    // Helper to add activity
    const addActivity = (message: string, type: string) => {
      activities.push({
        id: Math.random().toString(36).substring(7),
        type,
        message,
        time: 'az elmúlt 24 órában',
        timestamp: now
      });
    };

    // 1. Users
    if (newUsers > 0) {
      addActivity(`${newUsers} új felhasználó regisztrált`, 'user');
    }

    // 2. Clubs
    if (newClubs > 0) {
      if (newClubs <= 3) {
        const names = clubRegs.map(c => c.name).join(', ');
        addActivity(`Új klubok: ${names}`, 'club');
      } else {
        const names = clubRegs.map(c => c.name).join(', ');
        addActivity(`${names} és további ${newClubs - 3} klub regisztrált`, 'club');
      }
    }

    // 3. Tournaments
    if (newTournaments > 0) {
      addActivity(`${newTournaments} új verseny indult`, 'tournament');
    }

    // 4. Errors
    if (errorCount > 0) {
      addActivity(`${errorCount} hiba történt a rendszerben`, 'error'); // "30 errors occurred"
    }

    // 5. Feedback (Specific names)
    newFeedback.forEach((fb: any) => {
      const name = fb.userId?.name || 'Egy felhasználó';
      addActivity(`${name} visszajelzést küldött`, 'feedback');
    });

    // Fallback if empty
    if (activities.length === 0) {
       activities.push({
        id: 'no-activity',
        type: 'info',
        message: 'Nem történt aktivitás az elmúlt 24 órában.',
        time: 'most',
        timestamp: now
      });
    }

    return NextResponse.json({ success: true, data: activities });

  } catch (error) {
    console.error('Error fetching admin activities:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/activities', __GET as any);
