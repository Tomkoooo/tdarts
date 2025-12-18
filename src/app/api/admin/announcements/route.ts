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
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || undefined;

        const result = await AnnouncementService.getAnnouncementsForAdmin(page, limit, search);
        
        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Get admin announcements error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get announcements' },
            { status: 500 }
        );
    }
}
