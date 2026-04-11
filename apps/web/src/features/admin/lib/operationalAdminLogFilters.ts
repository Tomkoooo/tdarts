import type { FilterQuery } from 'mongoose';

import type { ILog } from '@tdarts/core';

/** Auth / user-flow errors that should not inflate admin dashboard metrics. */
const DASHBOARD_EXCLUDED_ERROR_SHAPES: FilterQuery<ILog>[] = [
  { category: { $regex: /^auth$/i } },
  { expected: true },
  { errorType: 'expected_user_error' },
  {
    errorCode: {
      $in: [
        'AUTH_INVALID_CREDENTIALS',
        'AUTH_USER_NOT_FOUND',
        'AUTH_INVALID_USER_ID',
        'AUTH_INVALID_TOKEN',
        'AUTH_INVALID_RESET_CODE',
        'AUTH_INVALID_VERIFICATION_CODE',
        'AUTHORIZATION_ERROR',
      ],
    },
  },
  { operation: { $regex: /^auth\./ } },
  { httpStatus: 401 },
];

/**
 * Error logs counted on the admin dashboard (stat cards + 24h alert). Excludes
 * auth flows, expected failures, known auth error codes, auth.* operations, and
 * HTTP 401 responses (unauthenticated clients).
 */
export const adminOperationalErrorFilter: FilterQuery<ILog> = {
  level: 'error',
  $nor: DASHBOARD_EXCLUDED_ERROR_SHAPES,
};

/**
 * Recent activity: omit the same noise, but only for error-level rows so info/warn
 * logs (e.g. registrations) still appear.
 */
export const adminRecentActivityExcludeNoiseFilter: FilterQuery<ILog> = {
  $nor: DASHBOARD_EXCLUDED_ERROR_SHAPES.map((clause) => ({
    level: 'error' as const,
    ...clause,
  })),
};
