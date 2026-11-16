#!/usr/bin/env bash
# Run ON the VPS after: cd ~/ai-sdk-pro && git fetch && git checkout <branch> && git pull
set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

REV="$(git rev-parse --short=7 HEAD)"
STAGE="${AI_SDK_DEPLOY_STAGE:-$HOME/.ai-sdk-deploy-staging}"
mkdir -p "$STAGE"
chmod 700 "$STAGE"
export AI_SDK_DEPLOY_STAGE="$STAGE"
printf 'Deploying checkpoint %s from %s (stage %s)\n' "$REV" "$REPO_ROOT" "$STAGE"

git archive --format=tar.gz --output="$STAGE/ai-sdk-pro-source.tar.gz" HEAD
install -m 644 infra/production/Caddyfile "$STAGE/ai-sdk-pro-Caddyfile"
install -m 644 infra/production/docker-compose.yml "$STAGE/ai-sdk-pro-compose.yml"
install -m 755 infra/production/install-app.sh "$STAGE/ai-sdk-pro-install.sh"

bash "$STAGE/ai-sdk-pro-install.sh" "$REV"

ENV_FILE=/opt/ai-sdk-pro/config/app.env
grep -q '^DEPLOY_DASHBOARD_ORIGIN=' "$ENV_FILE" 2>/dev/null || \
  echo 'DEPLOY_DASHBOARD_ORIGIN=https://deploy-staging.ai-sdk.pro' >> "$ENV_FILE"
chmod 600 "$ENV_FILE"
cd /opt/ai-sdk-pro
APP_IMAGE="ai-sdk-pro-web:$REV" docker compose up -d --force-recreate app

printf '\nDone. Check https://ai-sdk.pro/deploy and https://ai-sdk.pro/api/health\n'