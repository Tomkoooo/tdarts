export type TelemetryRange = '24h' | '7d' | '30d' | '90d' | 'custom';
export type TelemetryGranularity = 'minute' | 'hour' | 'day';
export type TelemetryMetric = 'calls' | 'latency' | 'traffic' | 'errors';

export type OverviewData = {
  status: 'healthy' | 'degraded' | 'critical';
  kpis: {
    totalCalls: number;
    totalErrors: number;
    errorRate: number;
    avgLatencyMs: number;
    peakLatencyMs: number;
    totalRequestBytes: number;
    totalResponseBytes: number;
    totalMovedBytes: number;
    avgPacketBytes: number;
    baselineAvgLatencyMs: number;
    baselineErrorRate: number;
  };
  incidents: {
    activeAnomalies: number;
    count4xx: number;
    count5xx: number;
  };
};

export type TrendPoint = {
  label: string;
  calls: number;
  baselineCalls: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number;
  baselineLatencyMs: number;
  requestBytes: number;
  responseBytes: number;
  totalBytes: number;
  avgPacketBytes: number;
};

export type IncidentsData = {
  anomalies: Array<{
    routeKey: string;
    method: string;
    signal: string;
    ratio: number;
    currentValue: number;
    baselineValue: number;
    lastDetectedAt: string;
  }>;
  errors: Array<{
    id: string;
    occurredAt: string;
    routeKey: string;
    method: string;
    status: number;
    durationMs: number;
    requestBytes: number;
    responseBytes: number;
    source: string;
    errorMessage: string;
  }>;
};

export type RouteRow = {
  routeKey: string;
  method: string;
  totalCalls: number;
  totalErrors: number;
  errorRate: number;
  avgLatencyMs: number;
  totalRequestBytes: number;
  totalResponseBytes: number;
  totalTrafficBytes: number;
  avgPacketBytes: number;
  baselineAvgLatencyMs: number;
  latencyRatio: number;
  baselineErrorRate: number;
  errorRateRatio: number;
  avgIncomingPacketBytes: number;
  avgOutgoingPacketBytes: number;
  lastSeen: string;
};

export type RouteDetailsData = {
  routeKey: string;
  method: string;
  summary: {
    totalCalls: number;
    baselineCalls: number;
    totalErrors: number;
    errorRate: number;
    baselineErrorRate: number;
    avgLatencyMs: number;
    baselineAvgLatencyMs: number;
    maxLatencyMs: number;
    totalTrafficBytes: number;
    avgPacketBytes: number;
    baselineAvgPacketBytes: number;
  };
  trend: Array<{
    label: string;
    calls: number;
    errors: number;
    avgLatencyMs: number;
  }>;
  recentErrors: Array<{
    id: string;
    occurredAt: string;
    method: string;
    routeKey: string;
    status: number;
    durationMs: number;
    requestBytes: number;
    responseBytes: number;
    source: string;
    errorMessage: string;
  }>;
  selectedError?: {
    id: string;
    occurredAt: string;
    routeKey: string;
    method: string;
    status: number;
    source: string;
    durationMs: number;
    requestBytes: number;
    responseBytes: number;
    request: {
      headers: Record<string, unknown>;
      query: Record<string, unknown>;
      body: unknown;
      bodyTruncated: boolean;
      bodyParseError: boolean;
      contentType: string | null;
    };
    response: {
      headers: Record<string, unknown>;
      body: unknown;
      bodyTruncated: boolean;
      bodyParseError: boolean;
      errorMessage: string | null;
    };
  } | null;
};
