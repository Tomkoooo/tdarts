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

const p50 = summaries['http.response_time']?.median ?? summaries['http.response_time']?.p50 ?? 0;
const p95 = summaries['http.response_time']?.p95 ?? 0;
const p99 = summaries['http.response_time']?.p99 ?? 0;
const requests = counters['http.requests'] || counters['vusers.completed'] || 0;
const errors = counters['errors'] || counters['vusers.failed'] || 0;
const errorRate = requests > 0 ? errors / requests : 0;
const vusersCreated = counters['vusers.created'] || 0;
const vusersFailed = counters['vusers.failed'] || 0;
const failedVuRate = vusersCreated > 0 ? vusersFailed / vusersCreated : 0;
const dropped =
  (counters['http.responses.dropped'] || 0) +
  (counters['vusers.failed'] || 0) +
  (counters['sse.failures'] || 0);

const out = {
  requests,
  errors,
  vusersCreated,
  vusersFailed,
  failedVuRate,
  dropped,
  errorRate,
  latencyMs: { p50, p95, p99 },
};

console.log(JSON.stringify(out, null, 2));

if (p95 > 300) {
  console.error(`Load assertion failed: p95 ${p95}ms exceeds 300ms`);
  process.exit(2);
}

if (errorRate >= 0.01) {
  console.error(`Load assertion failed: error rate ${errorRate} exceeds 1%`);
  process.exit(3);
}

if (failedVuRate >= 0.05) {
  console.error(`Load assertion failed: failed VU rate ${failedVuRate} exceeds 5%`);
  process.exit(4);
}
