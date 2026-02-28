import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST - Announcement aktiválás/deaktiválás (admin only)
async function __POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        const announcement = await AnnouncementService.toggleAnnouncement(id);
        
        if (!announcement) {
            return NextResponse.json(
                { success: false, error: 'Announcement not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            announcement,
            message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error: any) {
        console.error('Toggle announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to toggle announcement' },
            { status: 500 }
        );
    }
}

export const POST = withApiTelemetry('/api/announcements/[id]/toggle', __POST as any);
