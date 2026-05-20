import { z } from 'zod';
import { AuthService } from '@tdarts/services';
import { assertBoardAccess } from '@/features/board/lib/assertBoardAccess';

const bodySchema = z.object({
  tournamentId: z.string().min(1),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    await assertBoardAccess({
      tournamentId: body.tournamentId,
      password: body.password,
    });
    const { token, expiresInSec } = AuthService.issueBoardSocketToken(body.tournamentId);
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    return Response.json({
      token,
      socketToken: token,
      expiresInSec,
      expiresAt,
      ttlSeconds: expiresInSec,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message.includes('Unauthorized') ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
