import { NextRequest } from 'next/server';
import {
  captureRouteRequestPayload,
  captureRouteResponsePayload,
  estimateActionBytes,
  estimateRequestBytes,
  estimateResponseBytes,
} from '@/shared/lib/telemetry/context';
import {
  normalizeRouteKey,
  recordAggregate,
  recordErrorEvent,
  scheduleFlush,
} from '@/shared/lib/telemetry/sinks/apiTelemetrySink';
import {
  ActionTelemetryHandler,
  RouteTelemetryHandler,
  WithTelemetryActionOptions,
} from '@/shared/lib/telemetry/types';
import { isGuardFailureResult } from '@/shared/lib/guards/result';
import { AuthorizationError, BadRequestError, ValidationError } from '@/middleware/errorHandle';

function classifyMethodOperation(method: string): 'read' | 'write' | 'other' {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return 'read';
  if (m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE') return 'write';
  return 'other';
}

function classifyActionOperation(actionKey: string): 'read' | 'write' | 'other' {
  if (/get|list|fetch|search|stats|overview|detail|load|read/i.test(actionKey)) return 'read';
  if (/create|update|delete|remove|add|toggle|set|write|finish|start|manage/i.test(actionKey)) return 'write';
  return 'other';
}

function detectTimeout(status: number, error: unknown): boolean {
  if (status === 408 || status === 504) return true;
  if (!(error instanceof Error)) return false;
  return /timeout|timed out|etimedout|abort/i.test(error.message || '');
}

function resolveErrorStatus(error: unknown): number {
  if (
    error instanceof BadRequestError ||
    error instanceof ValidationError ||
    error instanceof AuthorizationError
  ) {
    return error.statusCode;
  }

  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number') {
      return statusCode;
    }
  }

  return 500;
}

export function withRouteTelemetry<TArgs extends unknown[]>(
  routeKey: string,
  handler: RouteTelemetryHandler<TArgs>
): RouteTelemetryHandler<TArgs> {
  const normalizedRoute = normalizeRouteKey(routeKey);

  return async (request: NextRequest, ...args: TArgs): Promise<Response> => {
    const startedAt = performance.now();
    const requestBytesPromise = estimateRequestBytes(request);
    const requestPayloadPromise = captureRouteRequestPayload(request);

    let status = 500;
    let response: Response | undefined;
    let capturedError: unknown;

    try {
      response = await handler(request, ...args);
      status = response.status;
      return response;
    } catch (error) {
      capturedError = error;
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);
      void Promise.all([
        requestBytesPromise,
        estimateResponseBytes(response),
        requestPayloadPromise,
        captureRouteResponsePayload(response),
      ])
        .then(([requestBytes, responseBytes, requestPayload, responsePayload]) => {
          recordAggregate({
            routeKey: normalizedRoute,
            method: request.method,
            sourceType: 'api',
            operationClass: classifyMethodOperation(request.method),
            durationMs,
            requestBytes,
            responseBytes,
            status,
            isTimeout: detectTimeout(status, capturedError),
          });

          if (status >= 400 || capturedError) {
            recordErrorEvent({
              occurredAt: new Date(),
              routeKey: normalizedRoute,
              method: request.method,
              sourceType: 'api',
              operationClass: classifyMethodOperation(request.method),
              status,
              isTimeout: detectTimeout(status, capturedError),
              requestId: request.headers.get('x-request-id') || undefined,
              durationMs,
              requestBytes,
              responseBytes,
              requestHeaders: requestPayload.requestHeaders,
              responseHeaders: responsePayload.responseHeaders,
              requestQuery: requestPayload.requestQuery,
              requestBody: requestPayload.requestBody,
              responseBody: responsePayload.responseBody,
              contentType: requestPayload.contentType,
              errorMessage: capturedError instanceof Error ? capturedError.message : undefined,
              source: capturedError ? 'exception' : 'http_status',
              requestBodyTruncated: requestPayload.requestBodyTruncated,
              responseBodyTruncated: responsePayload.responseBodyTruncated,
            });
          }

          scheduleFlush();
        })
        .catch(() => {
          // Telemetry failures must never affect responses.
        });
    }
  };
}

export function withTelemetry<TInput, TOutput>(
  actionKey: string,
  handler: ActionTelemetryHandler<TInput, TOutput>,
  options?: WithTelemetryActionOptions
): ActionTelemetryHandler<TInput, TOutput> {
  const normalizedRoute = normalizeRouteKey(actionKey);
  const method = options?.method || 'ACTION';

  return async (input: TInput): Promise<TOutput> => {
    const startedAt = performance.now();
    const requestBytes = estimateActionBytes(input);
    let responseBytes = 0;
    let status = 200;
    let result: TOutput | undefined;
    let capturedError: unknown;

    try {
      result = await handler(input);
      if (options?.resolveStatus) {
        status = options.resolveStatus(result);
      }
      responseBytes = estimateActionBytes(result);
      return result;
    } catch (error) {
      capturedError = error;
      status = resolveErrorStatus(error);
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);
      recordAggregate({
        routeKey: normalizedRoute,
        method,
        sourceType: 'action',
        operationClass:
          options?.metadata?.operationClass ||
          (method === 'ACTION' ? classifyActionOperation(actionKey) : classifyMethodOperation(method)),
        durationMs,
        requestBytes,
        responseBytes,
        status,
        isTimeout: detectTimeout(status, capturedError),
      });

      const guardFailure = isGuardFailureResult(result) ? result : undefined;
      if (capturedError || status >= 400) {
        recordErrorEvent({
          occurredAt: new Date(),
          routeKey: normalizedRoute,
          method,
          sourceType: 'action',
          operationClass:
            options?.metadata?.operationClass ||
            (method === 'ACTION' ? classifyActionOperation(actionKey) : classifyMethodOperation(method)),
          status,
          isTimeout: detectTimeout(status, capturedError),
          requestId: options?.requestId,
          durationMs,
          requestBytes,
          responseBytes,
          errorMessage:
            capturedError instanceof Error
              ? capturedError.message
              : guardFailure?.message || (status >= 400 ? 'Action returned non-success status' : undefined),
          source: capturedError ? 'exception' : 'http_status',
          requestQuery: options?.metadata
            ? {
                feature: options.metadata.feature || '',
                actionName: options.metadata.actionName || '',
                actorId: options.metadata.actorId || '',
                clubId: options.metadata.clubId || '',
                eligibilityOutcome: options.metadata.eligibilityOutcome || 'not_checked',
                denialCode: guardFailure?.code || options.metadata.denialCode || 'none',
              }
            : undefined,
        });
      }

      scheduleFlush();
    }
  };
}
