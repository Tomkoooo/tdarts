const recordAggregateMock = jest.fn();
const recordErrorEventMock = jest.fn();
const scheduleFlushMock = jest.fn();

jest.mock('@/shared/lib/telemetry/sinks/apiTelemetrySink', () => ({
  normalizeRouteKey: (v: string) => v,
  recordAggregate: recordAggregateMock,
  recordErrorEvent: recordErrorEventMock,
  scheduleFlush: scheduleFlushMock,
}));

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

import { getAuthorizedSessionAction } from '@/features/auth/actions';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';

describe('auth action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns guard denial and records telemetry error', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    const result = await getAuthorizedSessionAction(undefined);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(assertEligibilityResult).not.toHaveBeenCalled();
    expect(recordErrorEventMock).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('returns authorized session when guard chain passes', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'user-1' } });
    (assertEligibilityResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { allowed: true, paidOverride: true, reason: 'paid_override' },
    });

    const result = await getAuthorizedSessionAction(undefined);
    expect(result).toEqual({ userId: 'user-1' });
    expect(recordAggregateMock).toHaveBeenCalled();
  });
});
