#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"

echo "== wrangler whoami =="
npx wrangler whoami

echo "== local checks =="
npm test
npm run check
npm run dry-run

echo "== deploy-staging =="
curl -sS https://deploy-staging.ai-sdk.pro/health
echo
curl -fsS -o /dev/null -w "dashboard HTTP %{http_code}\n" https://deploy-staging.ai-sdk.pro/
curl -sS https://deploy-staging.ai-sdk.pro/api/me | head -c 120; echo

echo "== GitHub OAuth start =="
code=$(curl -sS -o /dev/null -w "%{http_code}" https://deploy-staging.ai-sdk.pro/auth/github)
echo "auth/github -> HTTP ${code} (expect 302)"

echo "== dispatch pilot route =="
curl -fsS -o /dev/null -w "urban-couscous-deploy-test HTTP %{http_code}\n" https://urban-couscous-deploy-test.ai-sdk.pro/ || echo "dispatch probe failed"