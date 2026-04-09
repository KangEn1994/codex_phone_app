#!/usr/bin/env bash

set -euo pipefail

CODEXAPP_SUPPORT_DIR="${CODEXAPP_SUPPORT_DIR:-/data/codexapp}"
CODEXAPP_CODEX_DIR="${CODEXAPP_CODEX_DIR:-${HOME:-/root}/.codex}"

mkdir -p "$CODEXAPP_SUPPORT_DIR" "$CODEXAPP_CODEX_DIR"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex binary not found in container PATH" >&2
  exit 1
fi

if [[ ! -f "$CODEXAPP_CODEX_DIR/config.toml" ]] && [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "warning: no Codex CLI config found in $CODEXAPP_CODEX_DIR and OPENAI_API_KEY is empty" >&2
fi

exec "$@"

