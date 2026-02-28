import { NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { withTournamentPermission, PermissionResult } from '@/lib/permissionMiddleware';
import { withApiTelemetry } from '@/lib/api-telemetry';

const __POST = withTournamentPermission(async (
  request,
  params,
  { user }: PermissionResult
) => {
  // Cancel knockout
  const { code } = await params;
  console.log(user.isAdmin);
  const success = await TournamentService.cancelKnockout(code);
  
  if (success) {
    return NextResponse.json({ 
      success: true, 
      message: 'Knockout cancelled successfully' 
    });
  } else {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to cancel knockout' 
    }, { status: 500 });
  }
});

export const POST = withApiTelemetry('/api/tournaments/[code]/cancel-knockout', __POST as any);
