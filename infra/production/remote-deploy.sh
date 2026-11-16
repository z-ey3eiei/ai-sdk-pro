#!/usr/bin/env bash
# Deploy a checked-out branch to the production VPS over SSH.
# Requires: VPS_SSH_PRIVATE_KEY (PEM contents) and optionally VPS_SSH_HOST (default deploy@167.172.73.127).
set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

HOST="${VPS_SSH_HOST:-deploy@167.172.73.127}"
REV="$(git rev-parse --short=7 HEAD)"

if [ -z "${VPS_SSH_PRIVATE_KEY:-}" ]; then
  echo "Set VPS_SSH_PRIVATE_KEY to the server private key PEM contents (Cursor env secret)." >&2
  exit 1
fi

KEY_FILE="$(mktemp)"
trap 'rm -f "$KEY_FILE" /tmp/ai-sdk-pro-source.tar.gz' EXIT
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

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