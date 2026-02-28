import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError, getRequestLogContext, handleError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  try {
    const { password } = await request.json();
    if (!password) {
      throw new BadRequestError('Password is required', 'auth', {
        tournamentId,
        errorCode: 'AUTH_PASSWORD_REQUIRED',
        expected: true,
        operation: 'api.board.validatePassword',
      });
    }

    const isValid = await TournamentService.validateTournamentByPassword(tournamentId, password);
    return NextResponse.json({ isValid });
  } catch (error) {
    const context = getRequestLogContext(request, {
      tournamentId,
      operation: 'api.board.validatePassword',
      entityType: 'tournament',
      entityId: tournamentId,
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json(body, { status });
  }
}