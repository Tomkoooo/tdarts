import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(request: NextRequest) {
    const { email, code } = await request.json();
    if (!email || !code) {
        throw new BadRequestError('Email and code are required');
    }
    await AuthService.verify2FA(email, code);
    return NextResponse.json({ message: '2FA verified successfully' });
}