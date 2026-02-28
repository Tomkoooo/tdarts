import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        
        // Get user from JWT token
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        const requesterId = user._id.toString();
        
        const body = await request.json();

        // Validate required fields
        if (body.roundsCount === undefined || body.roundsCount === null) {
            throw new BadRequestError('Missing required field: roundsCount');
        }

        if (body.roundsCount < 1 || body.roundsCount > 10) {
            throw new BadRequestError('Rounds count must be between 1 and 10');
        }

        // Call the service method to generate empty rounds
        const result = await TournamentService.generateEmptyKnockoutRounds(code, requesterId, body.roundsCount);

        if (!result) {
            throw new BadRequestError('Failed to generate empty rounds');
        }

        return NextResponse.json({
            success: true,
            message: `${body.roundsCount} empty rounds generated successfully`
        });
    } catch (error: any) {
        console.error('generateEmptyRounds error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate empty rounds' 
            }, 
            { status: 400 }
        );
    }
}

export const POST = withApiTelemetry('/api/tournaments/[code]/generateEmptyRounds', __POST as any);
