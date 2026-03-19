import fs from 'node:fs';

const reportPath = process.argv[2] || 'tests/load/results.json';

if (!fs.existsSync(reportPath)) {
  console.error(`Load report not found: ${reportPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(reportPath, 'utf8');
const data = JSON.parse(raw);
const aggregate = data.aggregate || {};
const counters = aggregate.counters || {};
const summaries = aggregate.summaries || {};

const hasHttpCounters = Boolean(counters['http.requests']) || Boolean(summaries['http.response_time']);
const hasLifecycleActionMetrics = Object.keys(summaries).some(
  (key) => key.startsWith('loadtest.') && key.endsWith('.latency_ms')
);
const profileKind = hasHttpCounters ? 'http' : hasLifecycleActionMetrics ? 'lifecycle' : 'unknown';

const p50 = summaries['http.response_time']?.median ?? summaries['http.response_time']?.p50 ?? 0;
const p95 = summaries['http.response_time']?.p95 ?? 0;
const p99 = summaries['http.response_time']?.p99 ?? 0;
const requests = hasHttpCounters ? Number(counters['http.requests'] || 0) : 0;
const timeoutErrors = Number(counters['errors.ETIMEDOUT'] || 0);
const rawErrors = Number(counters['errors'] || 0);
const errors = hasHttpCounters ? Math.max(rawErrors, timeoutErrors) : 0;
const errorRate = requests > 0 ? errors / requests : 0;
const vusersCreated = counters['vusers.created'] || 0;
const vusersFailed = counters['vusers.failed'] || 0;
const failedVuRate = vusersCreated > 0 ? vusersFailed / vusersCreated : 0;
const dropped =
  (hasHttpCounters ? (counters['http.responses.dropped'] || 0) : 0) +
  (counters['vusers.failed'] || 0) +
  (counters['sse.failures'] || 0);

const lifecycleLatencyMetrics = Object.keys(summaries)
  .filter((key) => key.startsWith('loadtest.') && key.endsWith('.latency_ms'))
  .map((key) => ({
    key,
    p95: Number(summaries[key]?.p95 || 0),
    p99: Number(summaries[key]?.p99 || 0),
  }))
  .sort((a, b) => b.p95 - a.p95);

const out = {
  profileKind,
  requests,
  errors,
  timeoutErrors,
  rawErrors,
  vusersCreated,
  vusersFailed,
  failedVuRate,
  dropped,
  errorRate,
  latencyMs: { p50, p95, p99 },
  lifecycleLatencyMetrics,
};

console.log(JSON.stringify(out, null, 2));

if (hasHttpCounters && p95 > 1500) {
  console.error(`Load assertion failed: p95 ${p95}ms exceeds 1500ms`);
  process.exit(2);
}

if (hasHttpCounters && errorRate >= 0.02) {
  console.error(`Load assertion failed: error rate ${errorRate} exceeds 2%`);
  process.exit(3);
}

if (failedVuRate >= 0.05) {
  console.error(`Load assertion failed: failed VU rate ${failedVuRate} exceeds 5%`);
  process.exit(4);
}
