import fs from 'node:fs';
import path from 'node:path';

const resultsPath = process.argv[2];
const summaryPath = process.argv[3];
const analysisPath = process.argv[4];
const outputPath = process.argv[5];

if (!resultsPath || !summaryPath || !analysisPath || !outputPath) {
  console.error('Usage: node scripts/generate-load-html-report.mjs <results.json> <summary.json> <analysis.md> <output.html>');
  process.exit(1);
}

for (const p of [resultsPath, summaryPath, analysisPath]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing input file: ${p}`);
    process.exit(1);
  }
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const analysis = fs.readFileSync(analysisPath, 'utf8');

const counters = results?.aggregate?.counters || {};
const summaries = results?.aggregate?.summaries || {};
const intermediate = Array.isArray(results?.intermediate) ? results.intermediate : [];
const profileKind = summary?.profileKind || 'unknown';

function downsampleSeries(series, maxPoints = 220) {
  if (!Array.isArray(series) || series.length <= maxPoints) {
    return series || [];
  }
  const bucketSize = Math.ceil(series.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < series.length; i += bucketSize) {
    const bucket = series.slice(i, i + bucketSize);
    if (!bucket.length) continue;
    const first = bucket[0];
    const timestamp = first?.period || first?.timestamp || Date.now();
    const countersInBucket = bucket.reduce(
      (acc, entry) => {
        const c = entry?.counters || {};
        acc.errors += Number(c.errors || 0);
        acc.vusersFailed += Number(c['vusers.failed'] || 0);
        acc.httpRequests += Number(c['http.requests'] || 0);
        return acc;
      },
      { errors: 0, vusersFailed: 0, httpRequests: 0 }
    );
    sampled.push({
      timestamp,
      errors: countersInBucket.errors,
      vusersFailed: countersInBucket.vusersFailed,
      httpRequests: countersInBucket.httpRequests,
    });
  }
  return sampled;
}

const allErrors = Object.entries(counters)
  .filter(([key, value]) => (key.includes('errors') || key.includes('failed')) && Number(value) > 0)
  .sort((a, b) => Number(b[1]) - Number(a[1]));
const topErrors = allErrors.slice(0, 15);

const topLatencyMetrics = Object.entries(summaries)
  .filter(([key]) => key.includes('latency_ms') || key.includes('http.response_time'))
  .map(([key, stat]) => ({
    key,
    p95: Number(stat?.p95 || 0),
    p99: Number(stat?.p99 || 0),
  }))
  .sort((a, b) => b.p95 - a.p95)
  .slice(0, 12);

const lifecycleLatencyMetrics = Array.isArray(summary?.lifecycleLatencyMetrics)
  ? summary.lifecycleLatencyMetrics
  : [];
const topLifecycleByCount = Object.entries(counters)
  .filter(([key, value]) => key.startsWith('loadtest.') && key.endsWith('.requests') && Number(value) > 0)
  .sort((a, b) => Number(b[1]) - Number(a[1]))
  .slice(0, 5);

const endpointLatencyRows = Object.entries(summaries)
  .filter(([key]) => key.startsWith('plugins.metrics-by-endpoint.response_time.'))
  .map(([key, stat]) => {
    const route = key.replace('plugins.metrics-by-endpoint.response_time.', '');
    const timeoutKey = `plugins.metrics-by-endpoint.${route}.errors.ETIMEDOUT`;
    return {
      route,
      count: Number(stat?.count || 0),
      p50: Number(stat?.median ?? stat?.p50 ?? 0),
      p95: Number(stat?.p95 || 0),
      p99: Number(stat?.p99 || 0),
      max: Number(stat?.max || 0),
      timeoutErrors: Number(counters[timeoutKey] || 0),
    };
  })
  .sort((a, b) => {
    if (b.timeoutErrors !== a.timeoutErrors) return b.timeoutErrors - a.timeoutErrors;
    return b.p95 - a.p95;
  });

const topEndpointP95 = [...endpointLatencyRows].sort((a, b) => b.p95 - a.p95).slice(0, 20);
const topEndpointTimeouts = [...endpointLatencyRows]
  .filter((x) => x.timeoutErrors > 0)
  .sort((a, b) => b.timeoutErrors - a.timeoutErrors)
  .slice(0, 20);

const endpointRowsHtml = endpointLatencyRows
  .map((row) => {
    const timeoutRate = row.count > 0 ? ((row.timeoutErrors / row.count) * 100).toFixed(2) : '0.00';
    return `<tr>
      <td title="${row.route}">${row.route}</td>
      <td>${row.count}</td>
      <td>${row.p50.toFixed(1)}</td>
      <td>${row.p95.toFixed(1)}</td>
      <td>${row.p99.toFixed(1)}</td>
      <td>${row.max.toFixed(1)}</td>
      <td>${row.timeoutErrors}</td>
      <td>${timeoutRate}%</td>
    </tr>`;
  })
  .join('');

const allErrorRowsHtml = allErrors
  .map(([key, value]) => `<tr><td title="${key}">${key}</td><td>${Number(value)}</td></tr>`)
  .join('');

const timeline = downsampleSeries(intermediate, 160);
const timelineLabels = timeline.map((entry) => {
  const ts = new Date(entry.timestamp || Date.now());
  return ts.toLocaleTimeString();
});
const timelineErrors = timeline.map((entry) => Number(entry.errors || 0));
const timelineVusersFailed = timeline.map((entry) => Number(entry.vusersFailed || 0));
const timelineHttpReq = timeline.map((entry) => Number(entry.httpRequests || 0));

const endpointCountFromSummary = endpointLatencyRows.reduce((acc, row) => acc + row.count, 0);
const timeoutCountFromCounters = Number(counters['errors.ETIMEDOUT'] || 0);
const endpointTimeoutCount = endpointLatencyRows.reduce((acc, row) => acc + row.timeoutErrors, 0);

const dataQualityChecks = [
  {
    name: 'Endpoint timeout counters sum',
    expected: timeoutCountFromCounters,
    actual: endpointTimeoutCount,
    ok: endpointTimeoutCount === timeoutCountFromCounters || endpointTimeoutCount <= timeoutCountFromCounters,
    note: 'Endpoint timeout total should closely match global ETIMEDOUT.',
  },
  {
    name: 'HTTP request counter availability',
    expected: Number(counters['http.requests'] || 0),
    actual: endpointCountFromSummary,
    ok: Number(counters['http.requests'] || 0) > 0 ? endpointCountFromSummary > 0 : true,
    note: 'Endpoint chart data present for http/browse profiles.',
  },
];
const dataQualityRowsHtml = dataQualityChecks
  .map(
    (row) =>
      `<tr><td>${row.name}</td><td>${row.expected}</td><td>${row.actual}</td><td>${row.ok ? 'OK' : 'MISMATCH'}</td><td>${row.note}</td></tr>`
  )
  .join('');

const filesMeta = {
  results: path.basename(resultsPath),
  summary: path.basename(summaryPath),
  analysis: path.basename(analysisPath),
  countersCsv: 'counters.csv',
  endpointCsv: 'endpoint-latency.csv',
  actionCsv: 'action-latency.csv',
  timelineCsv: 'timeline.csv',
  browserCsv: 'browser-vitals.csv',
};

const payload = {
  summary,
  profileKind,
  topErrors,
  topLatencyMetrics,
  lifecycleLatencyMetrics,
  topLifecycleByCount,
  topEndpointP95,
  topEndpointTimeouts,
  timelineLabels,
  timelineErrors,
  timelineVusersFailed,
  timelineHttpReq,
  allErrorCount: allErrors.length,
  endpointRows: endpointLatencyRows.length,
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>tDarts Load Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0b1220;
      --panel: #121a2b;
      --panel2: #17233a;
      --text: #e8efff;
      --muted: #a9b6d3;
      --accent: #66d9ef;
      --warn: #ffb86c;
      --danger: #ff6b6b;
      --ok: #7ee787;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: var(--bg); color: var(--text); overflow-y: auto; }
    .wrap { max-width: 1280px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 28px; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; align-items: start; }
    .card { background: linear-gradient(180deg, var(--panel), var(--panel2)); border: 1px solid #22304d; border-radius: 12px; padding: 16px; }
    .kpi { grid-column: span 3; }
    .chart-lg { grid-column: span 12; }
    .chart-md { grid-column: span 6; }
    .chart-sm { grid-column: span 4; }
    .chart-box-lg { height: 340px; }
    .chart-box-md { height: 320px; }
    .chart-box-sm { height: 260px; }
    .table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid #2a3859; }
    .table td:first-child { max-width: 560px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .muted { color: var(--muted); }
    pre { white-space: pre-wrap; margin: 0; color: #d7e2ff; font-size: 12px; max-height: 460px; overflow: auto; }
    .val { font-size: 30px; font-weight: 700; margin-top: 6px; }
    .table-wrap { max-height: 460px; overflow: auto; border: 1px solid #2a3859; border-radius: 10px; }
    a { color: #a8ecff; }
    code { color: #b5f5ff; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>tDarts Load Test Dashboard</h1>
    <div class="grid">
      <div class="card kpi"><div class="muted">Requests</div><div id="kpiRequests" class="val">-</div></div>
      <div class="card kpi"><div class="muted">Errors</div><div id="kpiErrors" class="val">-</div></div>
      <div class="card kpi"><div class="muted">Error Rate</div><div id="kpiErrorRate" class="val">-</div></div>
      <div class="card kpi"><div class="muted">Latency (p95)</div><div id="kpiP95" class="val">-</div></div>
      <div class="card chart-lg">
        <h3>Run Mode</h3>
        <div id="runModeText" class="muted"></div>
        <div class="muted" style="margin-top: 8px;">
          Source files:
          <a href="${filesMeta.results}" target="_blank" rel="noopener">${filesMeta.results}</a> |
          <a href="${filesMeta.summary}" target="_blank" rel="noopener">${filesMeta.summary}</a> |
          <a href="${filesMeta.analysis}" target="_blank" rel="noopener">${filesMeta.analysis}</a> |
          <a href="${filesMeta.endpointCsv}" target="_blank" rel="noopener">${filesMeta.endpointCsv}</a> |
          <a href="${filesMeta.countersCsv}" target="_blank" rel="noopener">${filesMeta.countersCsv}</a> |
          <a href="${filesMeta.actionCsv}" target="_blank" rel="noopener">${filesMeta.actionCsv}</a> |
          <a href="${filesMeta.timelineCsv}" target="_blank" rel="noopener">${filesMeta.timelineCsv}</a> |
          <a href="${filesMeta.browserCsv}" target="_blank" rel="noopener">${filesMeta.browserCsv}</a>
        </div>
      </div>

      <div class="card chart-lg">
        <h3>Timeline - Requests vs Errors</h3>
        <div class="chart-box-lg"><canvas id="timeline"></canvas></div>
      </div>
      <div class="card chart-sm">
        <h3>Top Error Counters (Top 15)</h3>
        <div class="chart-box-md"><canvas id="errorsChart"></canvas></div>
      </div>
      <div class="card chart-sm">
        <h3>Endpoint p95 (Top 20)</h3>
        <div class="chart-box-sm"><canvas id="endpointP95Chart"></canvas></div>
      </div>
      <div class="card chart-sm">
        <h3>Endpoint Timeouts (Top 20)</h3>
        <div class="chart-box-sm"><canvas id="endpointTimeoutChart"></canvas></div>
      </div>
      <div class="card chart-md">
        <h3>Top Latency Metrics (p95)</h3>
        <div class="chart-box-md"><canvas id="latencyChart"></canvas></div>
      </div>
      <div class="card chart-md">
        <h3>Lifecycle Action p95</h3>
        <div class="chart-box-md"><canvas id="lifecycleChart"></canvas></div>
      </div>
      <div class="card chart-lg">
        <h3>Data Quality Checks</h3>
        <table class="table">
          <thead><tr><th>Check</th><th>Expected</th><th>Actual</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>${dataQualityRowsHtml}</tbody>
        </table>
      </div>
      <div class="card chart-lg">
        <h3>Endpoint Metrics (All Routes)</h3>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Route</th><th>Count</th><th>p50</th><th>p95</th><th>p99</th><th>Max</th><th>Timeouts</th><th>Timeout Rate</th></tr>
            </thead>
            <tbody>${endpointRowsHtml || '<tr><td colspan="8">No endpoint response-time metrics found.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="card chart-lg">
        <h3>Error Counters (All)</h3>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>${allErrorRowsHtml || '<tr><td colspan="2">No error counters.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="card chart-lg">
        <h3>Full Analysis Markdown</h3>
        <pre>${analysis}</pre>
      </div>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(payload)};
    const summary = data.summary || {};
    const isLifecycle = data.profileKind === 'lifecycle';

    if (isLifecycle) {
      const addPlayer = (summary.lifecycleLatencyMetrics || []).find(x => x.key === 'loadtest.add_player.latency_ms');
      const listMatches = (summary.lifecycleLatencyMetrics || []).find(x => x.key === 'loadtest.list_matches.latency_ms');
      document.getElementById('kpiRequests').textContent = (summary.vusersCreated || 0).toLocaleString();
      document.getElementById('kpiErrors').textContent = (summary.vusersFailed || 0).toLocaleString();
      document.getElementById('kpiErrorRate').textContent = ((summary.failedVuRate || 0) * 100).toFixed(2) + '%';
      document.getElementById('kpiP95').textContent = (addPlayer?.p95 || listMatches?.p95 || 0) + ' ms';
      document.getElementById('runModeText').textContent =
        'Lifecycle profile detected: HTTP page counters are not emitted in this mode. KPIs above show VU health and action latency.';
    } else {
      document.getElementById('kpiRequests').textContent = (summary.requests || 0).toLocaleString();
      document.getElementById('kpiErrors').textContent = (summary.errors || 0).toLocaleString();
      document.getElementById('kpiErrorRate').textContent = ((summary.errorRate || 0) * 100).toFixed(2) + '%';
      document.getElementById('kpiP95').textContent = (summary.latencyMs?.p95 || 0) + ' ms';
      document.getElementById('runModeText').textContent =
        'HTTP browse/full profile detected: endpoint and page timeout metrics are shown.';
    }
    new Chart(document.getElementById('timeline'), {
      type: 'line',
      data: {
        labels: data.timelineLabels,
        datasets: [
          { label: 'HTTP Requests', data: data.timelineHttpReq, borderColor: '#66d9ef', tension: 0.2 },
          { label: 'Errors', data: data.timelineErrors, borderColor: '#ff6b6b', tension: 0.2 },
          { label: 'VU Failed', data: data.timelineVusersFailed, borderColor: '#ffb86c', tension: 0.2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        parsing: false,
        normalized: true,
      }
    });

    new Chart(document.getElementById('errorsChart'), {
      type: 'bar',
      data: {
        labels: data.topErrors.map(x => x[0]),
        datasets: [{ label: 'Count', data: data.topErrors.map(x => Number(x[1])), backgroundColor: '#ff6b6b' }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false }
    });

    new Chart(document.getElementById('endpointP95Chart'), {
      type: 'bar',
      data: {
        labels: data.topEndpointP95.map(x => x.route),
        datasets: [{ label: 'p95 (ms)', data: data.topEndpointP95.map(x => x.p95), backgroundColor: '#66d9ef' }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false }
    });

    new Chart(document.getElementById('endpointTimeoutChart'), {
      type: 'bar',
      data: {
        labels: data.topEndpointTimeouts.map(x => x.route),
        datasets: [{ label: 'ETIMEDOUT count', data: data.topEndpointTimeouts.map(x => x.timeoutErrors), backgroundColor: '#ff6b6b' }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false }
    });

    const latencyLabels = isLifecycle
      ? (data.lifecycleLatencyMetrics || []).map(x => x.key)
      : data.topLatencyMetrics.map(x => x.key);
    const latencyValues = isLifecycle
      ? (data.lifecycleLatencyMetrics || []).map(x => x.p95)
      : data.topLatencyMetrics.map(x => x.p95);
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels: latencyLabels,
        datasets: [{ label: 'p95 (ms)', data: latencyValues, backgroundColor: '#66d9ef' }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false }
    });

    new Chart(document.getElementById('lifecycleChart'), {
      type: 'bar',
      data: {
        labels: (data.lifecycleLatencyMetrics || []).map(x => x.key),
        datasets: [{ label: 'p95 (ms)', data: (data.lifecycleLatencyMetrics || []).map(x => x.p95), backgroundColor: '#7ee787' }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false }
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote HTML report: ${outputPath}`);
