#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
missing=0

run_detect_secrets() {
  if command -v detect-secrets >/dev/null 2>&1; then
    detect-secrets scan --baseline "$ROOT_DIR/.secrets.baseline" --all-files
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    if python3 - <<'PY'
import importlib.util
import sys
sys.exit(0 if importlib.util.find_spec("detect_secrets") else 1)
PY
    then
      python3 -m detect_secrets scan --baseline "$ROOT_DIR/.secrets.baseline" --all-files
      return 0
    fi
  fi

  echo "detect-secrets is not installed. Install with: pip install detect-secrets" >&2
  return 1
}

run_gitleaks() {
  if ! command -v gitleaks >/dev/null 2>&1; then
    echo "gitleaks is not installed. Install from https://github.com/gitleaks/gitleaks" >&2
    return 1
  fi

  gitleaks detect --source "$ROOT_DIR" --verbose --no-git
}

if ! run_detect_secrets; then
  missing=1
fi

if ! run_gitleaks; then
  missing=1
fi

if [[ $missing -ne 0 ]]; then
  exit 1
fi
