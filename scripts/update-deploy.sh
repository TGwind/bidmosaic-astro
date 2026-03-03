#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="bidmosaic-astro"
BRANCH="${1:-master}"
HEALTH_URL="${2:-http://127.0.0.1:9002/}"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

cd "$APP_DIR"

log "Deploy start: branch=$BRANCH app_dir=$APP_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "Abort: working tree has uncommitted changes."
  exit 1
fi

log "Fetching latest code..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Installing dependencies..."
npm ci

log "Building project..."
npm run build

log "Restarting service: $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

log "Checking service status..."
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
  log "Service is not active."
  systemctl status "$SERVICE_NAME" --no-pager -l || true
  exit 1
fi

log "Checking health endpoint: $HEALTH_URL"
HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL")"
if [[ "$HTTP_CODE" != "200" ]]; then
  log "Health check failed, status=$HTTP_CODE"
  exit 1
fi

log "Deploy success."
