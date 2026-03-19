import fs from 'node:fs';
import path from 'node:path';

const artifactsRoot = path.join('src', 'features', 'tests', 'load', 'artifacts');
const requiredProfiles = ['full', 'browse', 'lifecycle'];
const keyRoutes = [
  '/en',
  '/en/home',
  '/en/search',
  '/en/profile',
  '/en/statistics',
  '/en/myclub',
  '/en/board/{{ tournamentCode }}',
  '/en/tournaments/{{ tournamentCode }}',
  '/en/tournaments/{{ tournamentCode }}/live',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listArtifactDirs() {
  if (!fs.existsSync(artifactsRoot)) return [];
  return fs
    .readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function loadArtifact(artifactDir) {
  const absoluteDir = path.join(artifactsRoot, artifactDir);
  const metadataPath = path.join(absoluteDir, 'run-metadata.json');
  const summaryPath = path.join(absoluteDir, 'summary.json');
  const resultsPath = path.join(absoluteDir, 'results.json');
  if (!fs.existsSync(metadataPath) || !fs.existsSync(summaryPath) || !fs.existsSync(resultsPath)) {
    return null;
  }

  const metadata = readJson(metadataPath);
  const summary = readJson(summaryPath);
  const results = readJson(resultsPath);
  const counters = results?.aggregate?.counters || {};
  const summaries = results?.aggregate?.summaries || {};
  return {
    artifactDir,
    profile: metadata.loadTestProfile || 'full',
    summary,
    counters,
    summaries,
  };
}

function latestByProfile() {
  const entries = listArtifactDirs()
    .map(loadArtifact)
    .filter(Boolean)
    .sort((a, b) => (a.artifactDir < b.artifactDir ? 1 : -1));

  const byProfile = new Map();
  for (const entry of entries) {
    if (!byProfile.has(entry.profile)) {
      byProfile.set(entry.profile, entry);
    }
  }
  return byProfile;
}

function pct(num) {
  return `${(num * 100).toFixed(2)}%`;
}

function buildRow(profile, entry) {
  const timeoutCount = Number(entry.counters['errors.ETIMEDOUT'] || 0);
  const rootTimeouts = Number(entry.counters['plugins.metrics-by-endpoint./en.errors.ETIMEDOUT'] || 0);
  const rootOk = Number(entry.counters['plugins.metrics-by-endpoint./en.codes.200'] || 0);
  const rootTotal = rootOk + rootTimeouts;
  const rootTimeoutRate = rootTotal > 0 ? rootTimeouts / rootTotal : 0;
  const rootTimeoutShare = timeoutCount > 0 ? rootTimeouts / timeoutCount : 0;
  const rootRespSummary = entry.summaries['plugins.metrics-by-endpoint.response_time./en'] || {};
  const rootP95 = Number(rootRespSummary.p95 || 0);
  const rootP99 = Number(rootRespSummary.p99 || 0);
  const routeStats = keyRoutes.map((route) => {
    const summaryKey = `plugins.metrics-by-endpoint.response_time.${route}`;
    const routeSummary = entry.summaries[summaryKey] || {};
    const timeoutErrors = Number(entry.counters[`plugins.metrics-by-endpoint.${route}.errors.ETIMEDOUT`] || 0);
    const ok200 = Number(entry.counters[`plugins.metrics-by-endpoint.${route}.codes.200`] || 0);
    const total = timeoutErrors + ok200;
    return {
      route,
      p95: Number(routeSummary.p95 || 0),
      p99: Number(routeSummary.p99 || 0),
      timeoutErrors,
      timeoutRate: total > 0 ? timeoutErrors / total : 0,
      total,
    };
  });
  const actionP99 = Object.entries(entry.summaries)
    .filter(([key]) => key.startsWith('loadtest.') && key.endsWith('.latency_ms'))
    .map(([key, stat]) => ({ key, p99: Number(stat?.p99 || 0) }))
    .sort((a, b) => b.p99 - a.p99);
  return {
    profile,
    artifact: entry.artifactDir,
    kind: entry.summary.profileKind || 'http',
    errorRate: Number(entry.summary.errorRate || 0),
    p95: Number(entry.summary.latencyMs?.p95 || 0),
    p99: Number(entry.summary.latencyMs?.p99 || 0),
    timeouts: timeoutCount,
    rootTimeouts,
    rootTimeoutRate,
    rootTimeoutShare,
    rootP95,
    rootP99,
    routeStats,
    actionP99,
  };
}

function report(rows, outputPath) {
  const lines = [];
  lines.push('# Timeout Remediation Verification');
  lines.push('');
  lines.push('## KPI Focus');
  lines.push('');
  lines.push('- Primary browse-route KPI: `/en` timeout rate <= 25%');
  lines.push('- Primary browse-route KPI: `/en` response-time p95 <= 1500ms');
  lines.push('- Secondary browse-route KPI: `/en` timeout share <= 50% of all ETIMEDOUT');
  lines.push('');
  lines.push('| Profile | Kind | Artifact | Error Rate | p95 (ms) | p99 (ms) | ETIMEDOUT | /en Timeouts | /en Timeout Rate | /en Timeout Share | /en p95 | /en p99 |');
  lines.push('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const row of rows) {
    const rootTimeoutRateTxt = row.rootTimeoutRate > 0 ? pct(row.rootTimeoutRate) : '-';
    const rootTimeoutShareTxt = row.rootTimeoutShare > 0 ? pct(row.rootTimeoutShare) : '-';
    lines.push(
      `| ${row.profile} | ${row.kind} | ${row.artifact} | ${pct(row.errorRate)} | ${row.p95.toFixed(1)} | ${row.p99.toFixed(1)} | ${row.timeouts} | ${row.rootTimeouts || 0} | ${rootTimeoutRateTxt} | ${rootTimeoutShareTxt} | ${row.rootP95.toFixed(1)} | ${row.rootP99.toFixed(1)} |`
    );
  }
  lines.push('');
  lines.push('## Browse Route Gates');
  lines.push('');
  const browseRow = rows.find((row) => row.profile === 'browse');
  if (browseRow) {
    lines.push('| Route | p95 (ms) | p99 (ms) | Timeouts | Timeout Rate |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const routeRow of browseRow.routeStats) {
      lines.push(
        `| \`${routeRow.route}\` | ${routeRow.p95.toFixed(1)} | ${routeRow.p99.toFixed(1)} | ${routeRow.timeoutErrors} | ${pct(routeRow.timeoutRate)} |`
      );
    }
  } else {
    lines.push('_No browse artifact row found._');
  }
  lines.push('');
  lines.push('## Action p99 Gates');
  lines.push('');
  const lifecycleRow = rows.find((row) => row.profile === 'lifecycle');
  if (lifecycleRow && lifecycleRow.actionP99.length) {
    lines.push('| Action Metric | p99 (ms) |');
    lines.push('|---|---:|');
    for (const action of lifecycleRow.actionP99) {
      lines.push(`| \`${action.key}\` | ${action.p99.toFixed(1)} |`);
    }
  } else {
    lines.push('_No lifecycle action metrics found._');
  }
  lines.push('');
  lines.push('## Auto Evaluation');

  const failureReasons = [];
  for (const row of rows) {
    if (row.errorRate > 0.25) {
      failureReasons.push(`${row.profile}: errorRate ${pct(row.errorRate)} > 25%`);
    }
    if (row.p99 > 5000) {
      failureReasons.push(`${row.profile}: p99 ${row.p99.toFixed(1)}ms > 5000ms`);
    }
    if (row.profile === 'browse') {
      if (row.rootTimeoutRate > 0.25) {
        failureReasons.push(`browse: /en timeout rate ${pct(row.rootTimeoutRate)} > 25%`);
      }
      if (row.rootP95 > 1500) {
        failureReasons.push(`browse: /en p95 ${row.rootP95.toFixed(1)}ms > 1500ms`);
      }
      if (row.rootTimeoutShare > 0.5) {
        failureReasons.push(`browse: /en timeout share ${pct(row.rootTimeoutShare)} > 50%`);
      }
      for (const routeRow of row.routeStats) {
        if (routeRow.total > 0 && routeRow.timeoutRate > 0.03) {
          failureReasons.push(`browse: ${routeRow.route} timeout rate ${pct(routeRow.timeoutRate)} > 3%`);
        }
        if (routeRow.p95 > 800) {
          failureReasons.push(`browse: ${routeRow.route} p95 ${routeRow.p95.toFixed(1)}ms > 800ms`);
        }
      }
    }
    if (row.profile === 'lifecycle') {
      for (const action of row.actionP99.slice(0, 6)) {
        if (action.p99 > 1500) {
          failureReasons.push(`lifecycle: ${action.key} p99 ${action.p99.toFixed(1)}ms > 1500ms`);
        }
      }
    }
  }

  if (failureReasons.length) {
    lines.push('- Result: **REGRESSION DETECTED**');
    for (const reason of failureReasons) {
      lines.push(`- ${reason}`);
    }
    lines.push('- Suggested immediate rollback test: `HOME_CACHE_ENABLED=false pnpm test:load:diagnostics`');
  } else {
    lines.push('- Result: **PASS**');
    lines.push('- All tracked profiles are within default thresholds.');
  }

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
  return { failureReasons };
}

function main() {
  const byProfile = latestByProfile();
  const missing = requiredProfiles.filter((profile) => !byProfile.has(profile));
  if (missing.length) {
    console.error(`Missing artifacts for profiles: ${missing.join(', ')}.`);
    console.error('Run diagnostics per profile first.');
    process.exit(2);
  }

  const rows = requiredProfiles.map((profile) => buildRow(profile, byProfile.get(profile)));
  const outputPath = path.join(artifactsRoot, `verification-${Date.now()}.md`);
  const { failureReasons } = report(rows, outputPath);
  console.log(`Verification report written to ${outputPath}`);

  if (failureReasons.length) {
    process.exit(1);
  }
}

main();
