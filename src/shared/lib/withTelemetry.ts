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
            durationMs,
            requestBytes,
            responseBytes,
            status,
          });

          if (status >= 400 || capturedError) {
            recordErrorEvent({
              occurredAt: new Date(),
              routeKey: normalizedRoute,
              method: request.method,
              status,
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
      status = 500;
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);
      recordAggregate({
        routeKey: normalizedRoute,
        method,
        durationMs,
        requestBytes,
        responseBytes,
        status,
      });

      const guardFailure = isGuardFailureResult(result) ? result : undefined;
      if (capturedError || status >= 400) {
        recordErrorEvent({
          occurredAt: new Date(),
          routeKey: normalizedRoute,
          method,
          status,
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
