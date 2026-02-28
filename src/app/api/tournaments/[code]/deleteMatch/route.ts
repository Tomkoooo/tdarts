import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const body = await request.json();
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        const requesterId = user._id.toString();

        // Validate required fields
        if (body.round === undefined || body.round === null) {
            throw new BadRequestError('Missing required field: round');
        }
        if (body.pairIndex === undefined || body.pairIndex === null) {
            throw new BadRequestError('Missing required field: pairIndex');
        }

        const result = await TournamentService.deleteKnockoutMatch(code, requesterId, {
            round: body.round,
            pairIndex: body.pairIndex
        });

        if (!result) {
            throw new BadRequestError('Failed to delete match');
        }

        return NextResponse.json({
            success: true,
            message: 'Match deleted successfully'
        });
    } catch (error: any) {
        console.error('deleteMatch error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to delete match' 
            }, 
            { status: 400 }
        );
    }
}

export const POST = withApiTelemetry('/api/tournaments/[code]/deleteMatch', __POST as any);
