const fs = require('fs');
const path = require('path');

const API_ROOT = path.join(process.cwd(), 'src', 'app', 'api');
const VERB_EXPORT_REGEX = /export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g;
const WRAPPER_REGEX = /withApiTelemetry\s*\(/;

const ALLOWLIST = new Set([]);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      out.push(fullPath);
    }
  }
  return out;
}

function toRel(filePath) {
  return path.relative(process.cwd(), filePath);
}

const files = walk(API_ROOT);
const violations = [];

for (const filePath of files) {
  const rel = toRel(filePath);
  if (ALLOWLIST.has(rel)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  if (!VERB_EXPORT_REGEX.test(content)) continue;
  if (WRAPPER_REGEX.test(content)) continue;

  violations.push(rel);
}

if (violations.length > 0) {
  console.error('Missing withApiTelemetry wrapper in API routes:');
  for (const rel of violations) {
    console.error(`- ${rel}`);
  }
  process.exit(1);
}

console.log(`API telemetry coverage OK (${files.length} route files checked).`);
