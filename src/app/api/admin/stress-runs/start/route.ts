import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService, StressRunRequestConfig } from '@/database/services/stress-run.service';
import { StressLoadRunner } from '@/lib/stress-load-runner';
import { ErrorService } from '@/database/services/error.service';

async function __POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin(request);
    if ('response' in admin) return admin.response;

    const body = (await request.json()) as StressRunRequestConfig;
    const config = StressRunService.resolveConfig(body);

    if (!config.baseUrl) {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
    }
    if (!config.tournamentCode && !config.autoProvisionLifecycle) {
      return NextResponse.json({ error: 'tournamentCode is required' }, { status: 400 });
    }
    if (config.parallelTournamentTest && !config.autoProvisionLifecycle) {
      return NextResponse.json(
        { error: 'parallelTournamentTest requires autoProvisionLifecycle so sandbox creation can be orchestrated safely.' },
        { status: 400 }
      );
    }
    if (config.parallelTournamentTest && config.parallelTournamentCount < 1) {
      return NextResponse.json({ error: 'parallelTournamentCount must be at least 1.' }, { status: 400 });
    }
    if (config.targetEnvironment === 'production' && !config.productionConfirmed) {
      return NextResponse.json(
        { error: 'Production runs require explicit danger-mode confirmation.' },
        { status: 400 }
      );
    }

    await StressRunService.assertCanStartRun();
    if (StressLoadRunner.hasActiveRun()) {
      return NextResponse.json({ error: 'A stress runner is already active.' }, { status: 409 });
    }

    const sandboxResolution = await StressRunService.resolveSandboxesForRun(admin.userId, config);
    const primarySandbox = sandboxResolution.primarySandbox;
    const resolvedConfig = { ...config, tournamentCode: primarySandbox.tournamentCode };
    const preflight = {
      authMode: 'session_admin_token',
      endpointProfile: resolvedConfig.endpointProfile,
      lifecycleMode: resolvedConfig.autoProvisionLifecycle ? 'auto_provision' : 'existing_sandbox',
      parallelTournamentTest: resolvedConfig.parallelTournamentTest,
      parallelTournamentCount: sandboxResolution.sandboxes.length,
      provisionClubId: resolvedConfig.clubId || 'admin_default',
      resolvedTournamentCode: primarySandbox.tournamentCode,
      resolvedTournamentCodes: sandboxResolution.sandboxes.map((sandbox) => sandbox.tournamentCode),
      checks: [
        { key: 'adminSession', ok: true, message: 'Authenticated as admin user via active session cookie.' },
        { key: 'sandboxTournament', ok: true, message: `Resolved ${sandboxResolution.sandboxes.length} sandbox tournament(s).` },
        {
          key: 'parallelTournamentTest',
          ok: true,
          message: resolvedConfig.parallelTournamentTest
            ? 'Parallel tournament test is enabled (tournament + lifecycle streams run together).'
            : 'Parallel tournament test is disabled.',
        },
        {
          key: 'sandboxMatchPool',
          ok: sandboxResolution.sandboxes.every((sandbox) => sandbox.matchIds.length > 0),
          message: `Loaded match pools for ${sandboxResolution.sandboxes.length} sandbox tournament(s).`,
        },
        {
          key: 'sandboxPlayerPool',
          ok: sandboxResolution.sandboxes.every((sandbox) => sandbox.playerIds.length > 0),
          message: `Loaded player pools for ${sandboxResolution.sandboxes.length} sandbox tournament(s).`,
        },
      ],
    };
    const run = await StressRunService.createRun(admin.userId, resolvedConfig, sandboxResolution.sandboxes);

    await StressLoadRunner.start({
      runId: String(run._id),
      config: resolvedConfig,
      sandboxes: sandboxResolution.sandboxes.map((sandbox) => ({
        tournamentCode: sandbox.tournamentCode,
        matchIds: sandbox.matchIds.map((id) => String(id)),
        playerIds: sandbox.playerIds.map((id) => String(id)),
      })),
      authToken: request.cookies.get('token')?.value,
    });

    await ErrorService.logInfo('Stress run started', 'api', {
      operation: 'stress_run_start',
      endpoint: '/api/admin/stress-runs/start',
      userId: admin.userId,
      metadata: {
        runId: String(run._id),
        users: resolvedConfig.users,
        durationSeconds: resolvedConfig.durationSeconds,
        environment: resolvedConfig.targetEnvironment,
        tournamentCode: resolvedConfig.tournamentCode,
      },
    });

    return NextResponse.json({
      success: true,
      runId: String(run._id),
      run,
      runContext: preflight,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to start stress run' },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/admin/stress-runs/start', __POST as any);
