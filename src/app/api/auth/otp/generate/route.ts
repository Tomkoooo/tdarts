import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(request: NextRequest) {
    const { email } = await request.json();
    if (!email) {
        throw new BadRequestError('Email is required');
    }
    await AuthService.generateOTP(email);
}