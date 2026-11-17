#!/usr/bin/env bash
# Deploy the Glowboard static site to Cloudflare Pages (production).
# Usage: ./scripts/deploy.sh
# Optional env: PAGES_PROJECT (default glowboard-2027), PAGES_BRANCH (default main)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${PAGES_PROJECT:-glowboard-2027}"
BRANCH="${PAGES_BRANCH:-main}"

# wrangler looks upward for node_modules to store its cache; a root-owned
# /node_modules on this machine would otherwise make that fail.
mkdir -p "$ROOT/node_modules/.cache"

STAGE="$(mktemp -d)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

# tar is used instead of rsync so the script works on a minimal box.
tar -C "$ROOT" --exclude='.git' --exclude='node_modules' --exclude='tools' \
  --exclude='scripts' --exclude='.gitignore' --exclude='.wrangler' \
  --exclude='.cache' --exclude='README.md' -cf - . | tar -C "$STAGE" -xf -

COMMIT_HASH="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
COMMIT_MSG="$(git -C "$ROOT" log -1 --pretty=%s 2>/dev/null || true)"
DIRTY="false"
if [[ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null || true)" ]]; then
  DIRTY="true"
fi

ARGS=(pages deploy "$STAGE" --project-name "$PROJECT" --branch "$BRANCH")
if [[ -n "$COMMIT_HASH" ]]; then
  ARGS+=(--commit-hash "$COMMIT_HASH")
fi
if [[ -n "$COMMIT_MSG" ]]; then
  ARGS+=(--commit-message "$COMMIT_MSG")
fi
if [[ "$DIRTY" == "true" ]]; then
  ARGS+=(--commit-dirty=true)
fi

echo "Deploying $ROOT -> Cloudflare Pages project '$PROJECT' (branch $BRANCH)"
npx wrangler "${ARGS[@]}"
