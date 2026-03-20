import { NextRequest } from 'next/server';

export type RouteTelemetryHandler<TArgs extends unknown[]> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<Response>;

export type ActionTelemetryHandler<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export type GuardFailureCode = 'UNAUTHORIZED' | 'FEATURE_DISABLED';

export type GuardFailureStatus = 401 | 403;

export type GuardFailureResult = {
  ok: false;
  code: GuardFailureCode;
  status: GuardFailureStatus;
  message: string;
};

export type GuardSuccessResult<T> = {
  ok: true;
  data: T;
};

export type GuardResult<T> = GuardSuccessResult<T> | GuardFailureResult;

export type TelemetryAggregateSample = {
  routeKey: string;
  method: string;
  sourceType?: 'api' | 'action' | 'page';
  operationClass?: 'read' | 'write' | 'other';
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
  status: number;
  isTimeout?: boolean;
  pageVitals?: {
    ttfbMs?: number;
    fcpMs?: number;
    lcpMs?: number;
    inpMs?: number;
  };
};

export type TelemetryErrorSample = {
  occurredAt: Date;
  routeKey: string;
  method: string;
  sourceType?: 'api' | 'action' | 'page';
  operationClass?: 'read' | 'write' | 'other';
  status: number;
  isTimeout?: boolean;
  requestId?: string;
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestQuery?: Record<string, string | string[]>;
  requestBody?: string;
  responseBody?: string;
  contentType?: string;
  errorMessage?: string;
  source: 'exception' | 'http_status';
  requestBodyTruncated?: boolean;
  responseBodyTruncated?: boolean;
};

export type ActionTelemetryMeta = {
  feature?: string;
  actionName?: string;
  actorId?: string;
  clubId?: string;
  operationClass?: 'read' | 'write' | 'other';
  eligibilityOutcome?: 'allowed' | 'blocked' | 'not_checked';
  denialCode?: GuardFailureCode | 'none';
};

export type WithTelemetryActionOptions = {
  method?: string;
  metadata?: ActionTelemetryMeta;
  requestId?: string;
  resolveStatus?: (result: unknown) => number;
};
