"use client";

import axios from "axios";

type SocketAuthResponse = {
  token: string;
  expiresAt?: number;
  ttlSeconds?: number;
};

type GetSocketAuthTokenOptions = {
  minTtlMs?: number;
  forceRefresh?: boolean;
};

const DEFAULT_MIN_TTL_MS = 60_000;
const DEFAULT_FALLBACK_TTL_MS = 60_000;

let cachedToken: string | null = null;
let tokenExpiresAtMs = 0;
let inFlightTokenPromise: Promise<string> | null = null;

function resolveExpiryMs(payload: SocketAuthResponse): number {
  if (typeof payload.expiresAt === "number" && Number.isFinite(payload.expiresAt)) {
    return payload.expiresAt > 10_000_000_000 ? payload.expiresAt : payload.expiresAt * 1000;
  }
  if (typeof payload.ttlSeconds === "number" && Number.isFinite(payload.ttlSeconds)) {
    return Date.now() + payload.ttlSeconds * 1000;
  }
  return Date.now() + DEFAULT_FALLBACK_TTL_MS;
}

function isTokenFresh(minTtlMs: number) {
  return Boolean(cachedToken) && Date.now() + minTtlMs < tokenExpiresAtMs;
}

export function invalidateSocketAuthToken() {
  cachedToken = null;
  tokenExpiresAtMs = 0;
}

export async function getSocketAuthToken(options?: GetSocketAuthTokenOptions): Promise<string> {
  const minTtlMs = options?.minTtlMs ?? DEFAULT_MIN_TTL_MS;
  const forceRefresh = options?.forceRefresh ?? false;
  if (!forceRefresh && isTokenFresh(minTtlMs) && cachedToken) {
    return cachedToken;
  }
  if (inFlightTokenPromise) {
    return inFlightTokenPromise;
  }

  inFlightTokenPromise = axios
    .post("/api/socket/auth")
    .then((response) => {
      if (response.status === 503) {
        throw new Error("Socket authentication not configured");
      }
      const payload = response.data as SocketAuthResponse;
      if (!payload?.token) {
        throw new Error("Missing socket auth token");
      }
      cachedToken = payload.token;
      tokenExpiresAtMs = resolveExpiryMs(payload);
      return cachedToken;
    })
    .finally(() => {
      inFlightTokenPromise = null;
    });

  return inFlightTokenPromise;
}
