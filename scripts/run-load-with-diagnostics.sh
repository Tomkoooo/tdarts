#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

resolve_load_config() {
  case "${LOAD_TEST_PROFILE:-full}" in
    full)
      echo "src/features/tests/load/load-test.yaml"
      ;;
    browse)
      echo "src/features/tests/load/load-test-browse.yaml"
      ;;
    lifecycle)
      echo "src/features/tests/load/load-test-lifecycle.yaml"
      ;;
    stress)
      echo "src/features/tests/load/load-test-stress.yaml"
      ;;
    *)
      echo "Invalid LOAD_TEST_PROFILE='${LOAD_TEST_PROFILE:-}'. Use one of: full, browse, lifecycle, stress." >&2
      exit 2
      ;;
  esac
}

# Load env files so diagnostics tools and artillery share same settings.
set -a
[[ -f ".env.load-test" ]] && source ".env.load-test"
[[ -f ".env" ]] && source ".env"
set +a

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_DIR_REL="src/features/tests/load/artifacts/$TIMESTAMP"
ARTIFACT_DIR="$ROOT_DIR/$ARTIFACT_DIR_REL"
mkdir -p "$ARTIFACT_DIR"
LOAD_TEST_CONFIG="$(resolve_load_config)"

MONGOSTAT_PID=""
VMSTAT_PID=""
IOTOP_PID=""

cleanup() {
  if [[ -n "$MONGOSTAT_PID" ]] && kill -0 "$MONGOSTAT_PID" 2>/dev/null; then
    kill "$MONGOSTAT_PID" || true
  fi
  if [[ -n "$VMSTAT_PID" ]] && kill -0 "$VMSTAT_PID" 2>/dev/null; then
    kill "$VMSTAT_PID" || true
  fi
  if [[ -n "$IOTOP_PID" ]] && kill -0 "$IOTOP_PID" 2>/dev/null; then
    kill "$IOTOP_PID" || true
  fi
}
trap cleanup EXIT

echo "Artifacts directory: $ARTIFACT_DIR_REL"

run_preflight_server_check() {
  local target_url host port
  target_url="${LOAD_BASE_URL:-http://localhost:3000}"
  host="$(node -e "try{const u=new URL(process.argv[1]); process.stdout.write(u.hostname||'localhost');}catch{process.stdout.write('');}" "$target_url")"
  port="$(node -e "try{const u=new URL(process.argv[1]); const p=u.port || (u.protocol==='https:'?'443':'80'); process.stdout.write(String(p));}catch{process.stdout.write('');}" "$target_url")"

  if [[ -z "$host" || -z "$port" ]]; then
    echo "Preflight failed: invalid LOAD_BASE_URL '$target_url'" >&2
    exit 2
  fi

  local listeners listener_count
  listeners="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  listener_count="$(printf '%s\n' "$listeners" | awk 'NR>1 { print }' | wc -l | tr -d '[:space:]')"

  if [[ "$listener_count" -eq 0 ]]; then
    echo "Preflight failed: no process is listening on port $port for target $target_url" >&2
    exit 3
  fi

  if [[ "$listener_count" -gt 1 ]]; then
    echo "Preflight failed: multiple listeners detected on target port $port. Keep exactly one Next server for load tests." >&2
    printf '%s\n' "$listeners" >&2
    exit 4
  fi

  local command_line
  command_line="$(printf '%s\n' "$listeners" | awk 'NR==2 { for (i=9; i<=NF; i++) printf $i " "; }')"
  if [[ "$command_line" != *next* && "$command_line" != *node* ]]; then
    echo "Preflight warning: listener on port $port does not look like Next.js/node process: $command_line"
  fi
}

echo "Running preflight server check..."
run_preflight_server_check

cat > "$ARTIFACT_DIR/run-metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "loadBaseUrl": "${LOAD_BASE_URL:-http://localhost:3000}",
  "loadTestProfile": "${LOAD_TEST_PROFILE:-full}",
  "loadTestConfig": "$LOAD_TEST_CONFIG",
  "mongoUri": "${MONGODB_URI:-}",
  "mongoDbName": "${MONGODB_DB_NAME:-}",
  "loadTournamentPoolSize": "${LOAD_TOURNAMENT_POOL_SIZE:-}",
  "loadTournamentMinPlayers": "${LOAD_TOURNAMENT_MIN_PLAYERS:-}",
  "loadTournamentMaxPlayers": "${LOAD_TOURNAMENT_MAX_PLAYERS:-}"
}
EOF

if command -v mongostat >/dev/null 2>&1; then
  echo "Starting mongostat sampling..."
  MONGO_HOST="$(node -e "const uri=process.env.MONGODB_URI||''; try{const u=new URL(uri); process.stdout.write(u.host||'');}catch{process.stdout.write('');}")"
  if [[ -n "$MONGO_HOST" ]]; then
    mongostat --host "$MONGO_HOST" --json 1 > "$ARTIFACT_DIR/mongostat.jsonl" 2>&1 &
  else
    mongostat --json 1 > "$ARTIFACT_DIR/mongostat.jsonl" 2>&1 &
  fi
  MONGOSTAT_PID="$!"
else
  echo "mongostat not found, skipping DB live sampling."
fi

if command -v vm_stat >/dev/null 2>&1; then
  echo "Starting vm_stat sampling..."
  (while true; do
    date -u +"%Y-%m-%dT%H:%M:%SZ"
    vm_stat
    echo "---"
    sleep 5
  done) > "$ARTIFACT_DIR/vm_stat.log" 2>&1 &
  VMSTAT_PID="$!"
fi

if command -v iostat >/dev/null 2>&1; then
  echo "Starting iostat sampling..."
  iostat -w 5 > "$ARTIFACT_DIR/iostat.log" 2>&1 &
  IOTOP_PID="$!"
fi

echo "Capturing pre-run process snapshot..."
ps -ax -o pid,ppid,%cpu,%mem,rss,etime,command > "$ARTIFACT_DIR/process_snapshot_pre.txt"

set +e
echo "Running artillery load test..."
TARGET_URL="${LOAD_BASE_URL:-http://localhost:3000}"
if command -v pnpm >/dev/null 2>&1; then
  pnpm exec artillery run "$LOAD_TEST_CONFIG" --target "$TARGET_URL" --output "$ARTIFACT_DIR/results.json" | tee "$ARTIFACT_DIR/artillery_stdout.log"
else
  echo "pnpm not found in PATH. Cannot run project-local artillery binary."
  exit 127
fi
ARTILLERY_EXIT=$?

echo "Capturing post-run process snapshot..."
ps -ax -o pid,ppid,%cpu,%mem,rss,etime,command > "$ARTIFACT_DIR/process_snapshot_post.txt"

if [[ -f "$ARTIFACT_DIR/results.json" ]]; then
  echo "Generating summary JSON..."
  node scripts/summarize-load-report.mjs "$ARTIFACT_DIR/results.json" > "$ARTIFACT_DIR/summary.json"
  SUMMARY_EXIT=$?

  echo "Generating deep analysis markdown..."
  node scripts/analyze-load-report.mjs "$ARTIFACT_DIR/results.json" "$ARTIFACT_DIR/analysis.md"

  echo "Generating HTML dashboard..."
  node scripts/generate-load-html-report.mjs "$ARTIFACT_DIR/results.json" "$ARTIFACT_DIR/summary.json" "$ARTIFACT_DIR/analysis.md" "$ARTIFACT_DIR/report.html"
  echo "Exporting CSV datasets..."
  node scripts/export-load-report-data.mjs "$ARTIFACT_DIR/results.json" "$ARTIFACT_DIR"
  echo "Refreshing artifacts index..."
  node scripts/generate-load-index-html.mjs "src/features/tests/load/artifacts" "src/features/tests/load/artifacts/index.html"
else
  echo "No artillery results.json produced."
  SUMMARY_EXIT=1
fi
set -e

echo "Load diagnostics completed."
echo "  Artifacts: $ARTIFACT_DIR_REL"
echo "  Artillery exit code: $ARTILLERY_EXIT"
echo "  Summary exit code: $SUMMARY_EXIT"

if [[ $ARTILLERY_EXIT -ne 0 ]]; then
  exit "$ARTILLERY_EXIT"
fi

if [[ ${SUMMARY_EXIT:-0} -ne 0 ]]; then
  exit "$SUMMARY_EXIT"
fi
