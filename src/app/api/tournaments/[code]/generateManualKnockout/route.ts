import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        
        // Get user from JWT token
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        const requesterId = user._id.toString();

        // Call the service method to generate manual knockout
        const result = await TournamentService.generateManualKnockout(code, requesterId);

        if (!result) {
            throw new BadRequestError('Failed to generate manual knockout');
        }

        return NextResponse.json({
            success: true,
            message: 'Manual knockout generated successfully'
        });
    } catch (error: any) {
        console.error('generateManualKnockout error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate manual knockout' 
            }, 
            { status: 400 }
        );
    }
} 