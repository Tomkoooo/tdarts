import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// GET - Egyedi announcement lekérése (admin only)
async function __GET(
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

        const announcement = await AnnouncementService.getAnnouncementById(id);
        
        if (!announcement) {
            return NextResponse.json(
                { success: false, error: 'Announcement not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            announcement
        });
    } catch (error: any) {
        console.error('Get announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get announcement' },
            { status: 500 }
        );
    }
}

// PUT - Announcement módosítása (admin only)
async function __PUT(
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

        const body = await request.json();
        const updateData: any = {};

        // Csak a megadott mezőket frissítjük
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.type !== undefined) updateData.type = body.type;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.showButton !== undefined) updateData.showButton = body.showButton;
        if (body.buttonText !== undefined) updateData.buttonText = body.buttonText;
        if (body.buttonAction !== undefined) updateData.buttonAction = body.buttonAction;
        if (body.duration !== undefined) updateData.duration = body.duration;
        if (body.expiresAt !== undefined) updateData.expiresAt = new Date(body.expiresAt);

        const announcement = await AnnouncementService.updateAnnouncement(id, updateData);
        
        if (!announcement) {
            return NextResponse.json(
                { success: false, error: 'Announcement not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            announcement
        });
    } catch (error: any) {
        console.error('Update announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update announcement' },
            { status: 500 }
        );
    }
}

// DELETE - Announcement törlése (admin only)
async function __DELETE(
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

        const success = await AnnouncementService.deleteAnnouncement(id);
        
        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Announcement not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete announcement' },
            { status: 500 }
        );
    }
}

export const GET = withApiTelemetry('/api/announcements/[id]', __GET as any);
export const PUT = withApiTelemetry('/api/announcements/[id]', __PUT as any);
export const DELETE = withApiTelemetry('/api/announcements/[id]', __DELETE as any);
