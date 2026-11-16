#!/usr/bin/env bash
# Deploy a checked-out branch to the production VPS over SSH.
# Use either SSH_KEY=/path/to/key.pem (Termius / local) or VPS_SSH_PRIVATE_KEY= (Cursor agent secret).
set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

HOST="${VPS_SSH_HOST:-${HOST:-deploy@167.172.73.127}}"
REV="$(git rev-parse --short=7 HEAD)"

CLEANUP_KEY=
if [ -n "${SSH_KEY:-}" ] && [ -f "$SSH_KEY" ]; then
  KEY_FILE="$SSH_KEY"
elif [ -n "${VPS_SSH_PRIVATE_KEY:-}" ]; then
  KEY_FILE="$(mktemp)"
  CLEANUP_KEY=1
  printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
else
  echo "Set SSH_KEY to your key file (e.g. from Termius), or VPS_SSH_PRIVATE_KEY for Cloud Agent." >&2
  exit 1
fi

trap 'test -n "$CLEANUP_KEY" && rm -f "$KEY_FILE"; rm -f /tmp/ai-sdk-pro-source.tar.gz' EXIT

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o BatchMode=yes "$HOST" 'echo VPS_OK'
git archive --format=tar.gz --output=/tmp/ai-sdk-pro-source.tar.gz HEAD
scp -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new \
  /tmp/ai-sdk-pro-source.tar.gz \
  "$HOST:/tmp/ai-sdk-pro-source.tar.gz"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new \
  infra/production/Caddyfile \
  "$HOST:/tmp/ai-sdk-pro-Caddyfile"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new \
  infra/production/docker-compose.yml \
  "$HOST:/tmp/ai-sdk-pro-compose.yml"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new \
  infra/production/install-app.sh \
  "$HOST:/tmp/ai-sdk-pro-install.sh"

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new "$HOST" "bash /tmp/ai-sdk-pro-install.sh $REV"

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new "$HOST" \
  "set -euo pipefail; ENV_FILE=/opt/ai-sdk-pro/config/app.env; \
   grep -q '^DEPLOY_DASHBOARD_ORIGIN=' \"\$ENV_FILE\" || echo 'DEPLOY_DASHBOARD_ORIGIN=https://deploy-staging.ai-sdk.pro' >> \"\$ENV_FILE\"; \
   chmod 600 \"\$ENV_FILE\"; cd /opt/ai-sdk-pro; APP_IMAGE=ai-sdk-pro-web:$REV docker compose up -d --force-recreate app"

printf '\nDeployed ai-sdk-pro-web:%s — verify https://ai-sdk.pro/api/health and https://ai-sdk.pro/deploy\n' "$REV"