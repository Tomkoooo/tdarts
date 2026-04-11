import { StressRunService } from '@tdarts/services';
import { __stressRunnerTestUtils } from '@/lib/stress-load-runner';

describe('Stress runner endpoint profiles', () => {
  it('uses full match profile by default', () => {
    const config = StressRunService.resolveConfig({
      users: 100,
      durationSeconds: 120,
      targetEnvironment: 'staging',
      baseUrl: 'https://staging.example.com',
      tournamentCode: 'SBOX',
    });

    expect(config.endpointProfile).toBe('session_full_match');
    const keys = __stressRunnerTestUtils.buildEndpointPlans(config).map((p) => p.key);
    expect(keys).toContain('match_finish_leg_post');
    expect(keys).toContain('match_finish_post');
    expect(keys).toContain('match_undo_leg_post');
    expect(keys).toContain('match_update_player_post');
  });

  it('limits endpoint set for safe match profile', () => {
    const config = StressRunService.resolveConfig({
      users: 50,
      durationSeconds: 60,
      targetEnvironment: 'custom',
      baseUrl: 'https://load.example.com',
      tournamentCode: 'TEST',
      endpointProfile: 'session_safe_match',
    });

    const keys = __stressRunnerTestUtils.buildEndpointPlans(config).map((p) => p.key);
    expect(keys).toContain('match_update_board_status_post');
    expect(keys).toContain('match_update_settings_post');
    expect(keys).not.toContain('match_finish_leg_post');
    expect(keys).not.toContain('match_finish_post');
    expect(keys).not.toContain('match_undo_leg_post');
    expect(keys).not.toContain('match_update_player_post');
  });

  it('includes tournament lifecycle endpoints when parallel tournament test is enabled', () => {
    const config = StressRunService.resolveConfig({
      users: 80,
      durationSeconds: 90,
      targetEnvironment: 'staging',
      baseUrl: 'https://staging.example.com',
      tournamentCode: 'SBOX',
      autoProvisionLifecycle: true,
      parallelTournamentTest: true,
    });

    const keys = __stressRunnerTestUtils.buildEndpointPlans(config).map((p) => p.key);
    expect(keys).toContain('tournament_generate_groups_post');
    expect(keys).toContain('tournament_generate_knockout_post');
    expect(keys).toContain('tournament_finish_post');
  });
});
