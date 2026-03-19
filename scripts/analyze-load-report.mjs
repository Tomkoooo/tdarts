import fs from 'node:fs';
import path from 'node:path';

const reportPath = process.argv[2] || 'src/features/tests/load/results.json';
const outputPath = process.argv[3] || 'src/features/tests/load/analysis.md';

if (!fs.existsSync(reportPath)) {
  console.error(`Load report not found: ${reportPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(reportPath, 'utf8');
const data = JSON.parse(raw);
const aggregate = data.aggregate || {};
const counters = aggregate.counters || {};
const summaries = aggregate.summaries || {};
const summaryKeys = Object.keys(summaries);

const hasHttpRouteMetrics = summaryKeys.some((key) => key.startsWith('http.response_time.'));
const hasEndpointPluginMetrics = summaryKeys.some((key) =>
  key.startsWith('plugins.metrics-by-endpoint.response_time.')
);
const hasLifecycleMetrics = summaryKeys.some((key) => key.startsWith('loadtest.') && key.endsWith('.latency_ms'));

const profileKind = hasEndpointPluginMetrics || hasHttpRouteMetrics
  ? 'browse_or_page_http'
  : hasLifecycleMetrics
    ? 'lifecycle_actions'
    : 'unknown';

function getSummaryMetric(key) {
  const entry = summaries[key];
  if (!entry) return null;
  return {
    count: entry.count ?? 0,
    p50: entry.median ?? entry.p50 ?? 0,
    p95: entry.p95 ?? 0,
    p99: entry.p99 ?? 0,
    max: entry.max ?? 0,
  };
}

const overall =
  getSummaryMetric('http.response_time') ||
  getSummaryMetric('plugins.metrics-by-endpoint.response_time./en') ||
  {
  count: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  max: 0,
  };

const routeMetrics = Object.keys(summaries)
  .filter(
    (key) =>
      key.startsWith('http.response_time.') ||
      key.startsWith('plugins.metrics-by-endpoint.response_time.')
  )
  .filter((key) => !key.endsWith('.2xx') && !key.endsWith('.4xx') && !key.endsWith('.5xx'))
  .map((key) => ({ key, ...getSummaryMetric(key) }))
  .filter((row) => row.count > 0)
  .sort((a, b) => b.p95 - a.p95)
  .slice(0, 25);

const actionMetrics = Object.keys(summaries)
  .filter((key) => key.endsWith('.latency_ms') && key.startsWith('loadtest.'))
  .map((key) => ({ key, ...getSummaryMetric(key) }))
  .filter((row) => row.count > 0)
  .sort((a, b) => b.p95 - a.p95);

const errorCounters = Object.entries(counters)
  .filter(([key, value]) => key.includes('errors') || key.includes('fail') || key.includes('dropped'))
  .filter(([, value]) => Number(value) > 0)
  .sort((a, b) => Number(b[1]) - Number(a[1]));

const lines = [];
lines.push('# Load Test Analysis Input');
lines.push('');
lines.push(`- report: \`${reportPath}\``);
lines.push(`- generatedAt: \`${new Date().toISOString()}\``);
lines.push(`- profileKind: \`${profileKind}\``);
lines.push('');
lines.push('## Overall HTTP Latency');
lines.push('');
lines.push(`- requests: ${Number(counters['http.requests'] || 0)}`);
lines.push(`- errors: ${Number(counters.errors || 0)}`);
lines.push(`- vusers.created: ${Number(counters['vusers.created'] || 0)}`);
lines.push(`- vusers.failed: ${Number(counters['vusers.failed'] || 0)}`);
lines.push(`- latency p50/p95/p99/max (ms): ${overall.p50}/${overall.p95}/${overall.p99}/${overall.max}`);
if (profileKind === 'lifecycle_actions') {
  lines.push('- note: This run has no Artillery page-http counters; treat `loadtest.*` action metrics as primary latency source.');
}
lines.push('');

lines.push('## Slowest Page/Route Endpoints (Top 25 by p95)');
lines.push('');
if (!routeMetrics.length) {
  lines.push('_No per-route http.response_time.* metrics found in report summaries._');
} else {
  lines.push('| Metric | Count | p50 | p95 | p99 | max |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const row of routeMetrics) {
    lines.push(`| \`${row.key}\` | ${row.count} | ${row.p50} | ${row.p95} | ${row.p99} | ${row.max} |`);
  }
}
lines.push('');

lines.push('## Server Action/Lifecycle Custom Metrics');
lines.push('');
if (!actionMetrics.length) {
  lines.push('_No loadtest.*.latency_ms custom metrics found._');
} else {
  lines.push('| Metric | Count | p50 | p95 | p99 | max |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const row of actionMetrics) {
    lines.push(`| \`${row.key}\` | ${row.count} | ${row.p50} | ${row.p95} | ${row.p99} | ${row.max} |`);
  }
}
lines.push('');

lines.push('## Error Counters');
lines.push('');
if (!errorCounters.length) {
  lines.push('_No error/failure counters detected._');
} else {
  for (const [key, value] of errorCounters) {
    lines.push(`- ${key}: ${value}`);
  }
}
lines.push('');

lines.push('## Additional Evidence To Attach');
lines.push('');
lines.push('- `/en/admin/telemetry` export/screenshot');
lines.push('- DB stats during test (`mongostat`/`mongotop` logs)');
lines.push('- App process CPU/RAM snapshots');
lines.push('- Next.js server logs with slow requests/errors');
lines.push('');

const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote analysis report: ${outputPath}`);
