import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthService } from '@/database/services/auth.service';

// GET - Összes announcement lekérése (admin only)
export async function GET(request: NextRequest) {
    try {
        const token = await request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const user = await AuthService.verifyToken(token);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        const isAdmin = user.isAdmin
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const announcements = await AnnouncementService.getAnnouncementsForAdmin();
        
        return NextResponse.json({
            success: true,
            announcements
        });
    } catch (error: any) {
        console.error('Get admin announcements error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get announcements' },
            { status: 500 }
        );
    }
}
