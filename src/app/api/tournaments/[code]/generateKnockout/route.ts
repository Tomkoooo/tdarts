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
        
        const body = await request.json();

        // Get tournament to check format
        const tournament = await TournamentService.getTournament(code);
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        const format = tournament.tournamentSettings?.format || 'group_knockout';

        // Validate playersCount only for group_knockout format
        if (format === 'group_knockout') {
            if (body.playersCount === undefined || body.playersCount === null) {
                throw new BadRequestError('Missing required field: playersCount for group_knockout format');
            }

            // Validate playersCount is a power of 2
            if (!Number.isInteger(Math.log2(body.playersCount))) {
                throw new BadRequestError('playersCount must be a power of 2 (2, 4, 8, 16, 32)');
            }

        }

        // Call the service method to generate knockout
        const result = await TournamentService.generateKnockout(code, requesterId, {
            playersCount: body.playersCount
        });

        if (!result) {
            throw new BadRequestError('Failed to generate knockout rounds');
        }

        return NextResponse.json({
            success: true,
            message: 'Knockout rounds generated successfully'
        });
    } catch (error: any) {
        console.error('generateKnockout error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to generate knockout rounds' 
            }, 
            { status: 400 }
        );
    }
}
