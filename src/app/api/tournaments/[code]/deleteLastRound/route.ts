import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { AuthService } from "@/database/services/auth.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        const requesterId = user._id.toString();

        const result = await TournamentService.deleteLastKnockoutRound(code, requesterId);

        if (!result) {
            throw new BadRequestError('Failed to delete last round');
        }

        return NextResponse.json({
            success: true,
            message: 'Last round deleted successfully'
        });
    } catch (error: any) {
        console.error('deleteLastRound error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to delete last round' 
            }, 
            { status: 400 }
        );
    }
}
