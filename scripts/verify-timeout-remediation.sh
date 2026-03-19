#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RUN_PROFILES="${RUN_PROFILES:-true}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-false}"

run_profile() {
  local profile="$1"
  echo "Running diagnostics for profile=$profile"
  set +e
  LOAD_TEST_PROFILE="$profile" pnpm test:load:diagnostics
  local profile_exit=$?
  set -e
  if [[ "$profile_exit" -ne 0 ]]; then
    echo "Profile '$profile' completed with non-zero exit ($profile_exit). Continuing for cross-profile comparison."
  fi
  return 0
}

if [[ "$RUN_PROFILES" == "true" ]]; then
  run_profile "full"
  run_profile "browse"
  run_profile "lifecycle"
fi

set +e
pnpm perf:compare:timeout
COMPARE_EXIT=$?
set -e

if [[ "$COMPARE_EXIT" -ne 0 && "$AUTO_ROLLBACK" == "true" ]]; then
  echo "Regression detected. Running rollback check with HOME_CACHE_ENABLED=false on full profile."
  HOME_CACHE_ENABLED=false LOAD_TEST_PROFILE=full pnpm test:load:diagnostics
  pnpm perf:compare:timeout || true
fi

exit "$COMPARE_EXIT"
