#!/usr/bin/env bash

fail() {
  echo "❌ $1"
  exit 1
}

warn() {
  echo "⚠️  $1"
}

info() {
  echo "• $1"
}

success() {
  echo "✅ $1"
}

is_truthy() {
  local value="${1:-}"
  case "${value,,}" in
    1|true|yes|y|on) return 0 ;;
    *) return 1 ;;
  esac
}

require_command() {
  local cmd="$1"
  local message="${2:-${cmd} is not installed}"
  command -v "$cmd" >/dev/null 2>&1 || fail "$message"
}

require_file() {
  local path="$1"
  local message="${2:-Missing required file: ${path}}"
  [[ -f "$path" ]] || fail "$message"
}

require_var_assignment() {
  local file="$1"
  local var_name="$2"
  if ! grep -Eq "^[[:space:]]*${var_name}=" "$file"; then
    fail "${file} is missing ${var_name}"
  fi
}

trim_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

get_env_value() {
  local file="$1"
  local var_name="$2"
  local line raw

  line="$(grep -E "^[[:space:]]*${var_name}=" "$file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 1

  raw="${line#*=}"
  raw="$(trim_whitespace "$raw")"
  raw="${raw%$'\r'}"

  if [[ ${#raw} -ge 2 ]]; then
    first_char="${raw:0:1}"
    last_char="${raw: -1}"
    if [[ "$first_char" == "\"" && "$last_char" == "\"" ]]; then
      raw="${raw:1:${#raw}-2}"
    elif [[ "$first_char" == "'" && "$last_char" == "'" ]]; then
      raw="${raw:1:${#raw}-2}"
    fi
  fi

  printf '%s' "$raw"
}

require_non_empty_var() {
  local file="$1"
  local var_name="$2"
  require_var_assignment "$file" "$var_name"

  local value
  value="$(get_env_value "$file" "$var_name" || true)"
  [[ -n "$value" ]] || fail "${file} has an empty value for ${var_name}"
}

assert_min_length() {
  local value="$1"
  local min_len="$2"
  local name="$3"
  if (( ${#value} < min_len )); then
    fail "${name} must be at least ${min_len} characters long"
  fi
}
