import type { Caller, CallerKind } from './callerTypes';

/**
 * Tier 1 caller resolution (same rules as requireKnownCaller tRPC middleware).
 * Used by REST routes on the standalone API server.
 */
export function resolveCaller(headers: Headers): Caller | null {
  const clientId = headers.get('x-client-id');
  const clientSecret = headers.get('x-client-secret');
  const integrationKey = headers.get('x-integration-key');

  if (clientId && clientSecret) {
    const expectedId = process.env.API_MOBILE_CLIENT_ID;
    const expectedSecret = process.env.API_MOBILE_CLIENT_SECRET;
    if (
      expectedId &&
      expectedSecret &&
      clientId === expectedId &&
      clientSecret === expectedSecret
    ) {
      return { kind: 'mobile_app' as CallerKind, clientId };
    }
  }

  if (integrationKey) {
    const validKeys = (process.env.API_INTEGRATION_KEYS ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (validKeys.includes(integrationKey)) {
      return { kind: 'integration' as CallerKind, clientId: integrationKey };
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const devBypass = headers.get('x-dev-bypass');
    if (devBypass === process.env.API_DEV_BYPASS_SECRET) {
      return { kind: 'mobile_app' as CallerKind, clientId: 'dev-bypass' };
    }
  }

  return null;
}
