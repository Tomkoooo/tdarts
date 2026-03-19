import fs from 'node:fs';
import path from 'node:path';

const resultsPath = process.argv[2];
const outputDir = process.argv[3];

if (!resultsPath || !outputDir) {
  console.error('Usage: node scripts/export-load-report-data.mjs <results.json> <output-dir>');
  process.exit(1);
}

if (!fs.existsSync(resultsPath)) {
  console.error(`Missing results file: ${resultsPath}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const aggregate = results?.aggregate || {};
const counters = aggregate?.counters || {};
const summaries = aggregate?.summaries || {};
const intermediate = Array.isArray(results?.intermediate) ? results.intermediate : [];

function csvEscape(value) {
  const raw = value == null ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function writeCsv(targetPath, headers, rows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  fs.writeFileSync(targetPath, `${lines.join('\n')}\n`, 'utf8');
}

const counterRows = Object.entries(counters)
  .map(([metric, value]) => ({ metric, value: Number(value || 0) }))
  .sort((a, b) => b.value - a.value);
writeCsv(path.join(outputDir, 'counters.csv'), ['metric', 'value'], counterRows);

const endpointLatencyRows = [];
for (const [key, stat] of Object.entries(summaries)) {
  if (!key.startsWith('plugins.metrics-by-endpoint.response_time.')) continue;
  const route = key.replace('plugins.metrics-by-endpoint.response_time.', '');
  const timeoutKey = `plugins.metrics-by-endpoint.${route}.errors.ETIMEDOUT`;
  endpointLatencyRows.push({
    route,
    count: Number(stat?.count || 0),
    p50: Number(stat?.median ?? stat?.p50 ?? 0),
    p95: Number(stat?.p95 || 0),
    p99: Number(stat?.p99 || 0),
    max: Number(stat?.max || 0),
    timeoutErrors: Number(counters[timeoutKey] || 0),
  });
}
endpointLatencyRows.sort((a, b) => {
  if (b.timeoutErrors !== a.timeoutErrors) return b.timeoutErrors - a.timeoutErrors;
  return b.p95 - a.p95;
});
writeCsv(
  path.join(outputDir, 'endpoint-latency.csv'),
  ['route', 'count', 'p50', 'p95', 'p99', 'max', 'timeoutErrors'],
  endpointLatencyRows
);

const actionRows = [];
for (const [key, stat] of Object.entries(summaries)) {
  if (!key.startsWith('loadtest.') || !key.endsWith('.latency_ms')) continue;
  actionRows.push({
    metric: key,
    count: Number(stat?.count || 0),
    p50: Number(stat?.median ?? stat?.p50 ?? 0),
    p95: Number(stat?.p95 || 0),
    p99: Number(stat?.p99 || 0),
    max: Number(stat?.max || 0),
  });
}
actionRows.sort((a, b) => b.p95 - a.p95);
writeCsv(path.join(outputDir, 'action-latency.csv'), ['metric', 'count', 'p50', 'p95', 'p99', 'max'], actionRows);

const timelineRows = intermediate.map((entry) => {
  const c = entry?.counters || {};
  return {
    timestamp: Number(entry?.period || entry?.timestamp || 0),
    httpRequests: Number(c['http.requests'] || 0),
    errors: Number(c.errors || 0),
    etimedout: Number(c['errors.ETIMEDOUT'] || 0),
    vusersFailed: Number(c['vusers.failed'] || 0),
  };
});
writeCsv(path.join(outputDir, 'timeline.csv'), ['timestamp', 'httpRequests', 'errors', 'etimedout', 'vusersFailed'], timelineRows);

const browserRows = [];
for (const [key, stat] of Object.entries(summaries)) {
  if (!key.startsWith('browser.')) continue;
  browserRows.push({
    metric: key,
    count: Number(stat?.count || 0),
    p50: Number(stat?.median ?? stat?.p50 ?? 0),
    p95: Number(stat?.p95 || 0),
    p99: Number(stat?.p99 || 0),
    max: Number(stat?.max || 0),
  });
}
browserRows.sort((a, b) => b.p95 - a.p95);
writeCsv(path.join(outputDir, 'browser-vitals.csv'), ['metric', 'count', 'p50', 'p95', 'p99', 'max'], browserRows);

console.log(`Exported CSV data to ${outputDir}`);
