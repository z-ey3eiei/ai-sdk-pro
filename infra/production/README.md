# Prepared VPS production helpers

The current owner VPS has a live deployment; see `../DEPLOYMENT-STATE.md` for the verified runtime revision, server and DNS status. These helpers contain no API keys or private SSH keys. The installation script intentionally stops after a private app smoke check and Caddy config validation; it does not open the firewall, change DNS, or launch public HTTPS by itself.

Docker Buildx is required for this BuildKit Dockerfile. It is installed on the current VPS. For a fresh Ubuntu host, check `docker buildx version` and install the distribution package `docker-buildx` if missing before running the build.

### Deploy from your computer (Termius / SSH key file) — recommended

You already use SSH to the VPS; **no Cursor “secrets” needed**.

```bash
git clone https://github.com/z-ey3eiei/ai-sdk-pro.git
cd ai-sdk-pro
git checkout cursor/embed-deploy-on-site-0650   # or main after merge
export SSH_KEY="$HOME/path/to/your-server-key.pem"
export HOST="deploy@167.172.73.127"
bash infra/production/remote-deploy.sh
```

`SSH_KEY` = path to the same private key you use in Termius. Takes a few minutes (build image on the VPS).

### Deploy from Cloud Agent (optional)

Only if you want the **agent VM** to SSH out: add `VPS_SSH_PRIVATE_KEY` in Cursor Dashboard → Cloud Agents → Secrets, then start a **new** agent message.

From the intended clean source checkpoint, provide your separately stored private key:

```bash
export SSH_KEY=/secure/path/ai-sdk-pro-server-key.pem
export HOST=root@167.172.73.127
REV=$(git rev-parse --short=7 HEAD)
git archive --format=tar.gz --output=/tmp/ai-sdk-pro-source.tar.gz HEAD
scp -i "$SSH_KEY" /tmp/ai-sdk-pro-source.tar.gz "$HOST:/tmp/ai-sdk-pro-source.tar.gz"
scp -i "$SSH_KEY" infra/production/Caddyfile "$HOST:/tmp/ai-sdk-pro-Caddyfile"
scp -i "$SSH_KEY" infra/production/docker-compose.yml "$HOST:/tmp/ai-sdk-pro-compose.yml"
scp -i "$SSH_KEY" infra/production/install-app.sh "$HOST:/tmp/ai-sdk-pro-install.sh"
ssh -i "$SSH_KEY" "$HOST" "bash /tmp/ai-sdk-pro-install.sh $REV"
```

The app has no published host port; only Caddy publishes 80/443. The public app environment is written with `BYOK_ONLY=true` and allowed `ai-sdk.pro`/`www` origins, without owner model credentials. The source image is tagged `ai-sdk-pro-web:<short-SHA>`; all Compose commands need `APP_IMAGE` set to this image.

After verifying the private app and configuring apex/www DNS, open TCP 80/443 on this NEW server only and start Caddy:

```bash
ssh -i "$SSH_KEY" "$HOST" "ufw allow 80/tcp && ufw allow 443/tcp && cd /opt/ai-sdk-pro && APP_IMAGE=ai-sdk-pro-web:$REV docker compose up -d caddy"
```

Verify the origin certificate, domain routing, liveness and BYOK rejection/error handling before reporting deployment success. Then enable Cloudflare proxy and Full (strict) as appropriate. `/api/ready` in BYOK mode verifies only runtime readiness, not provider-key validity. Real model smoke testing needs a visitor-owned key. Never put the private SSH key, DigitalOcean token, or sandbox model credential in source, build context, app environment, shell output, or logs.

Caddy uses a checked official Cloudflare IP range snapshot for trusted proxy identity. Refresh those ranges from Cloudflare official sources if they change; do not trust arbitrary forwarded headers or private ranges by default. Request/access-body logging is not enabled.
