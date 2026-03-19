import fs from 'node:fs';
import path from 'node:path';

const artifactsRoot = process.argv[2] || 'src/features/tests/load/artifacts';
const outputPath = process.argv[3] || path.join(artifactsRoot, 'index.html');

if (!fs.existsSync(artifactsRoot)) {
  console.error(`Artifacts directory not found: ${artifactsRoot}`);
  process.exit(1);
}

const runs = fs
  .readdirSync(artifactsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const runDir = path.join(artifactsRoot, entry.name);
    const summaryPath = path.join(runDir, 'summary.json');
    const analysisPath = path.join(runDir, 'analysis.md');
    const reportPath = path.join(runDir, 'report.html');
    if (!fs.existsSync(summaryPath) || !fs.existsSync(reportPath)) {
      return null;
    }
    let summary = {};
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    } catch {
      summary = {};
    }
    const analysisPreview = fs.existsSync(analysisPath)
      ? fs.readFileSync(analysisPath, 'utf8').split('\n').slice(0, 8).join('\n')
      : '';

    return {
      runId: entry.name,
      reportFile: `${entry.name}/report.html`,
      summary,
      analysisPreview,
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.runId.localeCompare(a.runId));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>tDarts Load Artifacts Index</title>
  <style>
    :root { --bg:#0b1220; --panel:#121a2b; --line:#243456; --text:#e8efff; --muted:#9eb0d7; --accent:#66d9ef; }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; overflow-y: auto; }
    .wrap { max-width: 1400px; margin: 0 auto; padding: 20px; }
    h1 { margin: 0 0 16px; }
    .layout { display: grid; grid-template-columns: 420px 1fr; gap: 16px; min-height: calc(100vh - 80px); }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
    .runs { overflow-y: auto; max-height: calc(100vh - 140px); }
    .run { padding: 10px; border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px; cursor: pointer; }
    .run:hover { border-color: var(--accent); }
    .run strong { display: block; margin-bottom: 6px; }
    .muted { color: var(--muted); font-size: 12px; }
    iframe { width: 100%; height: calc(100vh - 140px); border: 1px solid var(--line); border-radius: 10px; background: #0f1729; }
    .empty { color: var(--muted); padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>tDarts Load Test Artifacts</h1>
    <div class="layout">
      <div class="panel runs" id="runsPanel"></div>
      <div class="panel">
        <iframe id="reportFrame" title="Load report viewer"></iframe>
      </div>
    </div>
  </div>
  <script>
    const runs = ${JSON.stringify(runs)};
    const runsPanel = document.getElementById('runsPanel');
    const frame = document.getElementById('reportFrame');

    function renderRuns() {
      if (!runs.length) {
        runsPanel.innerHTML = '<div class="empty">No completed runs with report.html found.</div>';
        return;
      }
      runsPanel.innerHTML = runs.map((run, idx) => {
        const s = run.summary || {};
        const p95 = s?.latencyMs?.p95 ?? 0;
        const err = ((s?.errorRate || 0) * 100).toFixed(2);
        return \`
          <div class="run" data-idx="\${idx}">
            <strong>\${run.runId}</strong>
            <div class="muted">requests: \${(s.requests || 0).toLocaleString()} | errors: \${(s.errors || 0).toLocaleString()}</div>
            <div class="muted">p95: \${p95} ms | error rate: \${err}%</div>
          </div>
        \`;
      }).join('');
      runsPanel.querySelectorAll('.run').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-idx'));
          frame.src = runs[idx].reportFile;
        });
      });
      frame.src = runs[0].reportFile;
    }

    renderRuns();
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote load artifacts index: ${outputPath}`);
