import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const body = await request.json();

        // Validate required fields
        if (body.round === undefined || body.round === null) {
            throw new BadRequestError('Missing required field: round');
        }

        // Check if this is a partial match (only one player) or full match (both players)
        const isPartialMatch = !body.player1Id || !body.player2Id;
        
        if (isPartialMatch) {
            // Partial match - at least one player must be specified
            if (!body.player1Id && !body.player2Id) {
                throw new BadRequestError('At least one player must be specified for partial match');
            }
            
            // Call the service method to add partial match
            const result = await TournamentService.addPartialMatch(code, {
                round: body.round,
                player1Id: body.player1Id,
                player2Id: body.player2Id
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
            // Full match - both players required
            if (body.player1Id === undefined || body.player1Id === null) {
                throw new BadRequestError('Missing required field: player1Id');
            }

            if (body.player2Id === undefined || body.player2Id === null) {
                throw new BadRequestError('Missing required field: player2Id');
            }

            // Call the service method to add manual match
            const result = await TournamentService.addManualMatch(code, {
                round: body.round,
                player1Id: body.player1Id,
                player2Id: body.player2Id,
                scorerId: body.scorerId
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