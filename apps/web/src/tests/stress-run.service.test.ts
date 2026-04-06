import { StressRunService } from '@/database/services/stress-run.service';
import { __stressRunnerTestUtils } from '@/lib/stress-load-runner';

describe('Stress run configuration guardrails', () => {
  it('caps users and duration to hard limits', () => {
    const config = StressRunService.resolveConfig({
      users: 10_000,
      durationSeconds: 99_999,
      targetEnvironment: 'staging',
      baseUrl: 'https://example.com/',
      tournamentCode: 'abcd',
    });

    expect(config.users).toBe(1000);
    expect(config.durationSeconds).toBe(600);
    expect(config.baseUrl).toBe('https://example.com');
    expect(config.tournamentCode).toBe('ABCD');
    expect(config.endpointProfile).toBe('session_full_match');
  });

  it('requires exact danger confirmation for production mode', () => {
    const notConfirmed = StressRunService.resolveConfig({
      users: 100,
      durationSeconds: 120,
      targetEnvironment: 'production',
      baseUrl: 'https://prod.example.com',
      tournamentCode: 'SBOX',
      productionConfirmed: true,
      dangerModeConfirmation: 'wrong-value',
    });

    const confirmed = StressRunService.resolveConfig({
      users: 100,
      durationSeconds: 120,
      targetEnvironment: 'production',
      baseUrl: 'https://prod.example.com',
      tournamentCode: 'SBOX',
      productionConfirmed: true,
      dangerModeConfirmation: 'I_UNDERSTAND_THE_RISK',
    });

    expect(notConfirmed.productionConfirmed).toBe(false);
    expect(confirmed.productionConfirmed).toBe(true);
  });

  it('enables auto-provision lifecycle config when requested', () => {
    const config = StressRunService.resolveConfig({
      users: 40,
      durationSeconds: 120,
      targetEnvironment: 'staging',
      baseUrl: 'https://staging.example.com',
      tournamentCode: '',
      autoProvisionLifecycle: true,
      provisionPlayerCount: 48,
    });

    expect(config.autoProvisionLifecycle).toBe(true);
    expect(config.provisionPlayerCount).toBe(48);
    expect(config.tournamentCode).toBe('');
  });

  it('resolves parallel tournament mode and optional provision club id', () => {
    const config = StressRunService.resolveConfig({
      users: 60,
      durationSeconds: 180,
      targetEnvironment: 'staging',
      baseUrl: 'https://staging.example.com',
      tournamentCode: '',
      autoProvisionLifecycle: true,
      parallelTournamentTest: true,
      parallelTournamentCount: 6,
      clubId: '507f1f77bcf86cd799439011',
    });

    expect(config.parallelTournamentTest).toBe(true);
    expect(config.parallelTournamentCount).toBe(6);
    expect(config.clubId).toBe('507f1f77bcf86cd799439011');
  });

  it('allows endpoint weight overrides and drops zero-weight endpoints', () => {
    const config = StressRunService.resolveConfig({
      users: 50,
      durationSeconds: 60,
      targetEnvironment: 'custom',
      baseUrl: 'https://load.example.com',
      tournamentCode: 'TEST',
      weights: {
        avatarGet: 0,
        knockoutGet: 0,
        matchUpdateSettingsPost: 0,
        matchFinishPost: 0,
      },
    });

    const plans = __stressRunnerTestUtils.buildEndpointPlans(config);
    const keys = plans.map((plan) => plan.key);
    expect(keys).toContain('tournament_get');
    expect(keys).toContain('match_get');
    expect(keys).not.toContain('avatar_get');
    expect(keys).not.toContain('knockout_get');
    expect(keys).not.toContain('match_update_settings_post');
    expect(keys).not.toContain('match_finish_post');
  });

  it('computes stable percentiles from latency samples', () => {
    const values = [9, 10, 12, 30, 100];
    expect(__stressRunnerTestUtils.percentile(values, 50)).toBe(12);
    expect(__stressRunnerTestUtils.percentile(values, 95)).toBe(100);
    expect(__stressRunnerTestUtils.percentile([], 95)).toBe(0);
  });
});
