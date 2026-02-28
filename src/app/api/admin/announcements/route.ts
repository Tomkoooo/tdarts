import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// GET - Összes announcement lekérése (admin only)
async function __GET(request: NextRequest) {
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

// POST - Új announcement létrehozása (admin only)
async function __POST(request: NextRequest) {
    try {
        const token = await request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const user = await AuthService.verifyToken(token);
        if (!user || !user.isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const announcement = await AnnouncementService.createAnnouncement(body);

        return NextResponse.json({
            success: true,
            announcement
        }, { status: 201 });
    } catch (error: any) {
        console.error('Create admin announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create announcement' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/admin/announcements', __GET as any);
export const POST = withApiTelemetry('/api/admin/announcements', __POST as any);
