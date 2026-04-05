import { ApiTelemetryService } from '@/database/services/api-telemetry.service';
import { TelemetryAggregateSample, TelemetryErrorSample } from '@/shared/lib/telemetry/types';

export function normalizeRouteKey(routeKey: string): string {
  return ApiTelemetryService.normalizeRouteKey(routeKey);
}

export function recordAggregate(sample: TelemetryAggregateSample): void {
  ApiTelemetryService.record(sample);
}

export function recordErrorEvent(sample: TelemetryErrorSample): void {
  ApiTelemetryService.recordErrorEvent(sample);
}

export function scheduleFlush(): void {
  ApiTelemetryService.scheduleFlushIfNeeded();
}
