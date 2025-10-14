import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { AuthService } from '@/database/services/auth.service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        
        // Get user from JWT token
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await AuthService.verifyToken(token);
        
        // Check if user is super admin (isAdmin === true)
        if (!user.isAdmin) {
            return NextResponse.json({ 
                error: 'Nincs jogosultság ehhez a művelethez. Csak super adminok használhatják ezt a funkciót.' 
            }, { status: 403 });
        }

        const requesterId = user._id.toString();

        // Check if tournament exists
        const tournament = await TournamentService.getTournament(code);
        if (!tournament) {
            return NextResponse.json({ error: 'Torna nem található' }, { status: 404 });
        }

        // Check if tournament is actually finished
        if (tournament.tournamentSettings?.status !== 'finished') {
            throw new BadRequestError('A torna nincs befejezve. Csak befejezett tornák újranyithatók.');
        }

        // Reopen the tournament
        const reopenedTournament = await TournamentService.reopenTournament(code, requesterId);

        if (!reopenedTournament) {
            throw new BadRequestError('Failed to reopen tournament');
        }

        return NextResponse.json({
            success: true,
            message: 'Torna befejezése sikeresen visszavonva. A torna újra aktív.',
            tournament: reopenedTournament
        });
    } catch (error: any) {
        console.error('reopenTournament error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Hiba történt a torna újranyitása során' 
            }, 
            { status: 400 }
        );
    }
}
