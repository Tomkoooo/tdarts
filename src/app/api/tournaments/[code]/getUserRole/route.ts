import { NextRequest, NextResponse } from "next/server";
import { getRequestLogContext, handleError } from "@/middleware/errorHandle";
import {
  EMPTY_TOURNAMENT_VIEWER_CONTEXT,
  getTournamentViewerContextFromToken,
} from "@/lib/tournament-viewer-context";
import { withApiTelemetry } from '@/lib/api-telemetry';

function isUnauthorizedError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("invalid token") ||
    message.includes("unauthorized") ||
    message.includes("user not found")
  );
}

function isNotFoundRoleContextError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("club not found") || message.includes("tournament not found");
}

async function __GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ ...EMPTY_TOURNAMENT_VIEWER_CONTEXT });
    }

    const viewer = await getTournamentViewerContextFromToken(code, token);
    return NextResponse.json(viewer);
  } catch (error: any) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ...EMPTY_TOURNAMENT_VIEWER_CONTEXT });
    }

    if (isNotFoundRoleContextError(error)) {
      return NextResponse.json(
        { ...EMPTY_TOURNAMENT_VIEWER_CONTEXT },
        { status: 404 }
      );
    }

    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.getUserRole',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    console.warn('[api-error-map]', {
      route: '/api/tournaments/[code]/getUserRole',
      mappedStatus: status,
      errorType: (error as any)?.name || 'unknown_error',
      message: (error as any)?.message || String(error),
    });
    return NextResponse.json({ ...body, ...EMPTY_TOURNAMENT_VIEWER_CONTEXT }, { status });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/getUserRole', __GET as any);
