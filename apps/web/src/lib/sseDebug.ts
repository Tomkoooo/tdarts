/**
 * Verbose SSE logging for debugging (core vs UI).
 *
 * Enable either:
 * - `NEXT_PUBLIC_SSE_DEBUG=true` in `.env` (rebuild dev server), or
 * - In DevTools: `localStorage.setItem('tdarts_sse_debug', '1')` then reload the page.
 */
export function isSseVerboseDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SSE_DEBUG === "true") {
    return true;
  }
  if (typeof window !== "undefined" && window.localStorage?.getItem("tdarts_sse_debug") === "1") {
    return true;
  }
  return false;
}
