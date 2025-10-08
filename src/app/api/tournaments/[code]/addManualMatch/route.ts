import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
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

        // Check if this is an empty pair (no players), partial match (one player), or full match (both players)
        const hasNoPlayers = !body.player1Id && !body.player2Id;
        const isPartialMatch = (body.player1Id && !body.player2Id) || (!body.player1Id && body.player2Id);
        
        if (hasNoPlayers) {
            // Empty pair - just add to knockout structure without creating a match
            const result = await TournamentService.addEmptyKnockoutPair(code, requesterId, {
                round: body.round
            });

            if (!result) {
                throw new BadRequestError('Failed to add empty pair');
            }

            return NextResponse.json({
                success: true,
                message: 'Empty pair added successfully',
                pair: result
            });
        } else if (isPartialMatch) {
            // Partial match - one player specified, create match with one player
            const result = await TournamentService.addPartialMatch(code, requesterId, {
                round: body.round,
                player1Id: body.player1Id,
                player2Id: body.player2Id,
                boardNumber: body.boardNumber
            });

            if (!result) {
                throw new BadRequestError('Failed to add partial match');
            }

            return NextResponse.json({
                success: true,
                message: 'Partial match added successfully',
                match: result
            });
        } else {
            // Full match - both players specified
            const result = await TournamentService.addManualMatch(code, requesterId, {
                round: body.round,
                player1Id: body.player1Id,
                player2Id: body.player2Id,
                scorerId: body.scorerId,
                boardNumber: body.boardNumber,
            });

            if (!result) {
                throw new BadRequestError('Failed to add manual match');
            }

            return NextResponse.json({
                success: true,
                message: 'Manual match added successfully',
                match: result
            });
        }
    } catch (error: any) {
        console.error('addManualMatch error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to add manual match' 
            }, 
            { status: 400 }
        );
    }
} 