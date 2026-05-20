import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_KEY = 'tdarts_ads_sid';

export async function getOrCreateAdSessionId() {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_KEY)?.value;
  if (existing) return existing;
  const value = crypto.randomUUID();
  store.set(SESSION_COOKIE_KEY, value, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365 });
  return value;
}

export function hashActorId(actorId: string) {
  return crypto.createHash('sha256').update(actorId).digest('hex');
}
