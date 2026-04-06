import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/database/services/authorization.service', () => ({
  AuthorizationService: {
    isGlobalAdmin: jest.fn(),
    checkAdminOrModerator: jest.fn(),
  },
}));

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
    isClubFeatureEnabled: jest.fn(),
  },
}));

describe('featureAccess evaluator', () => {
  const originalSubscription = process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = originalSubscription;
  });

  it('returns login required when user is not authenticated', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: false, code: 'UNAUTHORIZED', status: 401, message: 'Unauthorized' });

    const result = await evaluateFeatureAccess({ featureName: 'LEAGUES', clubId: 'club-1', requiresSubscription: true });
    expect(result).toEqual({
      ok: false,
      code: 'LOGIN_REQUIRED',
      status: 401,
      message: 'Unauthorized',
    });
  });

  it('short-circuits for super admins', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'admin-1' } });
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(true);

    const result = await evaluateFeatureAccess({ featureName: 'LEAGUES', clubId: 'club-1', requiresSubscription: true });
    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'admin-1',
        featureKey: 'LEAGUES',
        bypassReason: 'super_admin',
      },
    });
    expect(FeatureFlagService.isFeatureEnabled).not.toHaveBeenCalled();
  });

  it('returns subscription required when paywall is on and club is ineligible', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(false);
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (FeatureFlagService.isClubFeatureEnabled as jest.Mock).mockResolvedValue(false);

    const result = await evaluateFeatureAccess({ featureName: 'LEAGUES', clubId: 'club-1', requiresSubscription: true });
    expect(result).toEqual({
      ok: false,
      code: 'SUBSCRIPTION_REQUIRED',
      status: 403,
      message: 'Feature requires subscription: LEAGUES',
    });
  });

  it('returns permission required when role check fails', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(false);
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (FeatureFlagService.isClubFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(false);

    const result = await evaluateFeatureAccess({
      featureName: 'LEAGUES',
      clubId: 'club-1',
      requiresSubscription: true,
      permissionCheck: ({ userId, clubId }) => AuthorizationService.checkAdminOrModerator(userId, clubId || ''),
    });
    expect(result).toEqual({
      ok: false,
      code: 'PERMISSION_REQUIRED',
      status: 403,
      message: 'Insufficient permissions',
    });
  });
});
