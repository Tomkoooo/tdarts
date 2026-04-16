/** Minutes until email verification / reset / magic-login links expire. */
export function authEmailLinkTtlMinutes(): number {
  const raw = process.env.AUTH_EMAIL_LINK_TTL_MIN;
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n > 0 && n <= 24 * 60) return Math.floor(n);
  return 60;
}

export function authPublicWebBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_ORIGIN ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
