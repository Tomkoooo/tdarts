import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = await request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        if (!user || !user.isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        
        // Remove empty strings to avoid validation errors if optional
        Object.keys(body).forEach(key => {
            if (body[key] === '') {
                delete body[key];
            }
        });

        const updated = await AnnouncementService.updateAnnouncement(id, body);

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, announcement: updated });
    } catch (error: any) {
        console.error('Update announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update announcement' },
            { status: 500 }
        );
    }
}

async function __DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = await request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        if (!user || !user.isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const deleted = await AnnouncementService.deleteAnnouncement(id);

        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete announcement' },
            { status: 500 }
        );
    }
}

export const PATCH = withApiTelemetry('/api/admin/announcements/[id]', __PATCH as any);
export const DELETE = withApiTelemetry('/api/admin/announcements/[id]', __DELETE as any);
