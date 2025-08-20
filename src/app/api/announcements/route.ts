import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementService } from '@/database/services/announcement.service';
import { AuthService } from '@/database/services/auth.service';

// GET - Aktív announcement-ok lekérése (nyilvános)
export async function GET() {
    try {
        const announcements = await AnnouncementService.getActiveAnnouncements();
        
        return NextResponse.json({
            success: true,
            announcements
        });
    } catch (error: any) {
        console.error('Get announcements error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get announcements' },
            { status: 500 }
        );
    }
}

// POST - Új announcement létrehozása (admin only)
export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { title, description, type, showButton, buttonText, buttonAction, duration, expiresAt } = body;

        // Validáció
        if (!title || !description || !expiresAt) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const announcement = await AnnouncementService.createAnnouncement({
            title,
            description,
            type: type || 'info',
            showButton: showButton || false,
            buttonText,
            buttonAction,
            duration: duration || 10000,
            expiresAt: new Date(expiresAt)
        });

        return NextResponse.json({
            success: true,
            announcement
        });
    } catch (error: any) {
        console.error('Create announcement error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create announcement' },
            { status: 500 }
        );
    }
}
