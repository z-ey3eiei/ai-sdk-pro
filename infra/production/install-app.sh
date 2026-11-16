#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT=/opt/ai-sdk-pro
RELEASE="${1:?Provide the checked checkpoint short SHA}"
STAGE="${AI_SDK_DEPLOY_STAGE:-/tmp}"
printf '\n--- source extraction ---\n'
mkdir -p "$ROOT/releases/$RELEASE" "$ROOT/config"
tar -xzf "$STAGE/ai-sdk-pro-source.tar.gz" -C "$ROOT/releases/$RELEASE"
install -m 600 "$STAGE/ai-sdk-pro-Caddyfile" "$ROOT/config/Caddyfile"
install -m 644 "$STAGE/ai-sdk-pro-compose.yml" "$ROOT/docker-compose.yml"
if [ ! -f "$ROOT/config/app.env" ]; then
  printf '%s\n' 'BYOK_ONLY=true' 'AI_PROVIDER=anthropic' 'AI_MODEL=claude-sonnet-4-6' 'APP_ORIGINS=https://ai-sdk.pro,https://www.ai-sdk.pro' > "$ROOT/config/app.env"
fi
chmod 600 "$ROOT/config/app.env"
ln -sfn "$ROOT/releases/$RELEASE" "$ROOT/current"
printf '\n--- isolated production image build (no model/API/admin keys) ---\n'
cd "$ROOT/releases/$RELEASE"
DOCKER_BUILDKIT=1 docker build --progress=plain -t "ai-sdk-pro-web:$RELEASE" -f Dockerfile .
printf '\n--- private smoke container ---\n'
if docker ps -a --format '{{.Names}}' | grep -qx ai-sdk-pro-smoke; then docker rm -f ai-sdk-pro-smoke; fi
docker run -d --name ai-sdk-pro-smoke --restart no --init --read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m --tmpfs /app/apps/web/.next/cache:rw,nosuid,nodev,size=128m,uid=1001,gid=1001 --cap-drop ALL --security-opt no-new-privileges:true --memory=1536m --pids-limit=256 --publish 127.0.0.1:3000:3000 --env-file "$ROOT/config/app.env" "ai-sdk-pro-web:$RELEASE"
for attempt in $(seq 1 60); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health >/dev/null; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:3000/api/health
printf '\n--- SSR page checks ---\n'
for path in / /chat /docs/getting-started /docs/architecture /manus-routes.json; do
  code=$(curl -sS --max-time 15 -o "$STAGE/aisdk-page-check" -w '%{http_code}' "http://127.0.0.1:3000$path")
  printf '%s %s\n' "$code" "$path"
  test "$code" = 200
done
printf '\n--- unconfigured provider must stay explicit ---\n'
code=$(curl -sS -o "$STAGE/aisdk-ready" -w '%{http_code}' http://127.0.0.1:3000/api/ready)
cat "$STAGE/aisdk-ready"; printf '\nreadiness HTTP=%s (200 expected in BYOK-only mode; visitor key is required for each chat)\n' "$code"
test "$code" = 200
docker rm -f ai-sdk-pro-smoke
printf '\n--- production app, private Docker network ---\n'
cd "$ROOT"
APP_IMAGE="ai-sdk-pro-web:$RELEASE" docker compose up -d app
APP_IMAGE="ai-sdk-pro-web:$RELEASE" docker compose pull caddy
APP_IMAGE="ai-sdk-pro-web:$RELEASE" docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
printf '\nAPP_BUILD_AND_PRIVATE_SMOKE_OK\n'
