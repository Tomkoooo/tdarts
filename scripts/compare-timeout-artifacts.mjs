import fs from 'node:fs';
import path from 'node:path';

const artifactsRoot = path.join('src', 'features', 'tests', 'load', 'artifacts');
const requiredProfiles = ['full', 'browse', 'lifecycle'];

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
