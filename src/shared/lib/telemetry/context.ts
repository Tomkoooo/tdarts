import { NextRequest } from 'next/server';
import { sanitizeHeaders, sanitizeQuery, trimBody } from '@/shared/lib/telemetry/redaction';

const textEncoder = new TextEncoder();
const MAX_ESTIMATED_BODY_BYTES = 1_000_000;

function parseContentLength(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTextLikeContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return (
    normalized.includes('application/json') ||
    normalized.includes('application/graphql') ||
    normalized.includes('application/x-www-form-urlencoded') ||
    normalized.includes('text/')
  );
}

function isSseContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('text/event-stream');
}

function estimateTextBytes(value: string): number {
  return Math.min(textEncoder.encode(value).length, MAX_ESTIMATED_BODY_BYTES);
}

export async function estimateRequestBytes(request: NextRequest): Promise<number> {
  const value = request.headers.get('content-length');
  const parsed = parseContentLength(value);
  if (parsed > 0) return parsed;

  if (request.method === 'GET' || request.method === 'HEAD') return 0;
  if (!isTextLikeContentType(request.headers.get('content-type'))) return 0;

  try {
    const body = await request.clone().text();
    return estimateTextBytes(body);
  } catch {
    return 0;
  }
}

export async function estimateResponseBytes(response?: Response): Promise<number> {
  if (!response) return 0;
  if (response.status === 204 || response.status === 304) return 0;
  if (isSseContentType(response.headers.get('content-type'))) return 0;

  const value = response.headers.get('content-length');
  const parsed = parseContentLength(value);
  if (parsed > 0) return parsed;
  if (!isTextLikeContentType(response.headers.get('content-type'))) return 0;

  try {
    const body = await response.clone().text();
    return estimateTextBytes(body);
  } catch {
    return 0;
  }
}

export async function captureRouteRequestPayload(request: NextRequest): Promise<{
  requestHeaders?: Record<string, string>;
  requestQuery?: Record<string, string | string[]>;
  requestBody?: string;
  requestBodyTruncated?: boolean;
  contentType?: string;
}> {
  const contentType = request.headers.get('content-type') || undefined;
  const requestHeaders = sanitizeHeaders(request.headers);
  const requestQuery = sanitizeQuery(request.url);

  if (request.method === 'GET' || request.method === 'HEAD') {
    return { requestHeaders, requestQuery, contentType };
  }
  if (!isTextLikeContentType(contentType || null)) {
    return { requestHeaders, requestQuery, contentType };
  }

  try {
    const body = await request.clone().text();
    const { value, truncated } = trimBody(body);
    return {
      requestHeaders,
      requestQuery,
      requestBody: value,
      requestBodyTruncated: truncated,
      contentType,
    };
  } catch {
    return { requestHeaders, requestQuery, contentType };
  }
}

export async function captureRouteResponsePayload(response?: Response): Promise<{
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}> {
  if (!response) return {};
  const responseHeaders = sanitizeHeaders(response.headers);
  const contentType = response.headers.get('content-type');

  if (isSseContentType(contentType)) return { responseHeaders };
  if (!isTextLikeContentType(contentType)) return { responseHeaders };

  try {
    const body = await response.clone().text();
    const { value, truncated } = trimBody(body);
    return {
      responseHeaders,
      responseBody: value,
      responseBodyTruncated: truncated,
    };
  } catch {
    return { responseHeaders };
  }
}

export function estimateActionBytes(value: unknown): number {
  if (value === null || value === undefined) return 0;
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return estimateTextBytes(text);
  } catch {
    return 0;
  }
}
