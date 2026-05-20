"use client";

import axios from "axios";

type SocketAuthResponse = {
  token?: string;
  /** Native/shared REST handler field (same value as `token`). */
  socketToken?: string;
  expiresAt?: number;
  ttlSeconds?: number;
  expiresInSec?: number;
};

type GetSocketAuthTokenOptions = {
  minTtlMs?: number;
  forceRefresh?: boolean;
};

export type BoardSocketAuthInput = {
  tournamentId: string;
  password?: string;
};

const DEFAULT_MIN_TTL_MS = 60_000;
const DEFAULT_FALLBACK_TTL_MS = 60_000;

let cachedToken: string | null = null;
let tokenExpiresAtMs = 0;
let inFlightTokenPromise: Promise<string> | null = null;

const boardTokenCache = new Map<
  string,
  { token: string; expiresAtMs: number; inFlight: Promise<string> | null }
>();

function resolveExpiryMs(payload: SocketAuthResponse): number {
  if (typeof payload.expiresAt === "number" && Number.isFinite(payload.expiresAt)) {
    return payload.expiresAt > 10_000_000_000 ? payload.expiresAt : payload.expiresAt * 1000;
  }
  if (typeof payload.ttlSeconds === "number" && Number.isFinite(payload.ttlSeconds)) {
    return Date.now() + payload.ttlSeconds * 1000;
  }
  if (typeof payload.expiresInSec === "number" && Number.isFinite(payload.expiresInSec)) {
    return Date.now() + payload.expiresInSec * 1000;
  }
  return Date.now() + DEFAULT_FALLBACK_TTL_MS;
}

function isTokenFresh(minTtlMs: number) {
  return Boolean(cachedToken) && Date.now() + minTtlMs < tokenExpiresAtMs;
}

function boardCacheKey(input: BoardSocketAuthInput) {
  return `${input.tournamentId}:${input.password ?? ""}`;
}

export function invalidateSocketAuthToken() {
  cachedToken = null;
  tokenExpiresAtMs = 0;
  boardTokenCache.clear();
}

export function invalidateBoardSocketAuthToken(tournamentId: string) {
  for (const key of boardTokenCache.keys()) {
    if (key.startsWith(`${tournamentId}:`)) {
      boardTokenCache.delete(key);
    }
  }
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
      const token = payload.token ?? payload.socketToken;
      if (!token) {
        throw new Error("Missing socket auth token");
      }
      cachedToken = token;
      tokenExpiresAtMs = resolveExpiryMs(payload);
      return cachedToken;
    })
    .finally(() => {
      inFlightTokenPromise = null;
    });

  return inFlightTokenPromise;
}

export async function getBoardSocketAuthToken(
  input: BoardSocketAuthInput,
  options?: GetSocketAuthTokenOptions
): Promise<string> {
  const minTtlMs = options?.minTtlMs ?? DEFAULT_MIN_TTL_MS;
  const forceRefresh = options?.forceRefresh ?? false;
  const key = boardCacheKey(input);
  const existing = boardTokenCache.get(key);

  if (
    !forceRefresh &&
    existing?.token &&
    Date.now() + minTtlMs < existing.expiresAtMs
  ) {
    return existing.token;
  }

  if (existing?.inFlight) {
    return existing.inFlight;
  }

  const entry = existing ?? { token: "", expiresAtMs: 0, inFlight: null };
  entry.inFlight = axios
    .post("/api/socket/board-auth", {
      tournamentId: input.tournamentId,
      password: input.password,
    })
    .then((response) => {
      if (response.status === 401) {
        throw new Error("Board socket authentication failed");
      }
      const payload = response.data as SocketAuthResponse;
      const token = payload.token ?? payload.socketToken;
      if (!token) {
        throw new Error("Missing board socket auth token");
      }
      entry.token = token;
      entry.expiresAtMs = resolveExpiryMs(payload);
      boardTokenCache.set(key, entry);
      return token;
    })
    .finally(() => {
      entry.inFlight = null;
      boardTokenCache.set(key, entry);
    });

  boardTokenCache.set(key, entry);
  return entry.inFlight;
}

/** Session token when logged in; otherwise board password token. */
export async function resolveSocketAuthToken(params: {
  boardAuth?: BoardSocketAuthInput;
  forceRefresh?: boolean;
}): Promise<string> {
  try {
    return await getSocketAuthToken({ forceRefresh: params.forceRefresh });
  } catch {
    if (!params.boardAuth?.tournamentId) {
      throw new Error("Socket authentication requires login or board access");
    }
    return getBoardSocketAuthToken(params.boardAuth, {
      forceRefresh: params.forceRefresh,
    });
  }
}
