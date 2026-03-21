/**
 * Load-test HTTP routes and authorizeUser x-load-test-secret bypass are disabled in
 * production unless ALLOW_LOAD_TEST_ENDPOINTS=true (e.g. staging image with NODE_ENV=production).
 */
export function isLoadTestEndpointsAllowedInCurrentEnvironment(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return process.env.ALLOW_LOAD_TEST_ENDPOINTS === 'true';
}
