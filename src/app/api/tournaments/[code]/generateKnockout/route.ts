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
        
        // Check if current date matches tournament start date (for knockout-only tournaments)
        if (format === 'knockout') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startDate = new Date(tournament.tournamentSettings.startDate);
          startDate.setHours(0, 0, 0, 0);

          if (today < startDate) {
            return NextResponse.json({
              success: false,
              error: 'A torna csak a kezdési napon indítható. Módosítsd a kezdési dátumot, ha korábban szeretnéd indítani.',
              canChangeDate: true,
              currentStartDate: startDate.toISOString(),
              currentDate: today.toISOString()
            }, { status: 400 });
          }
        }

        // Validate parameters for group_knockout format
        if (format === 'group_knockout') {
            // Accept either qualifiersPerGroup (new MDL system) or playersCount (legacy)
            if (body.qualifiersPerGroup !== undefined) {
                // Validate qualifiersPerGroup is 2, 3, or 4
                if (![2, 3, 4].includes(body.qualifiersPerGroup)) {
                    throw new BadRequestError('qualifiersPerGroup must be 2, 3, or 4');
                }
            } else if (body.playersCount === undefined || body.playersCount === null) {
                throw new BadRequestError('Missing required field: qualifiersPerGroup or playersCount');
            }
        }

        // Call the service method to generate knockout
        const result = await TournamentService.generateKnockout(code, requesterId, {
            playersCount: body.playersCount,
            qualifiersPerGroup: body.qualifiersPerGroup
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
