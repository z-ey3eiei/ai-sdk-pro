# Runbook สำหรับ ai-sdk.pro

เอกสารนี้เป็นขั้นตอนสำหรับผู้ดูแล VPS ของตนเองเท่านั้น งานนี้ยังไม่ได้เชื่อมต่อ VPS จริงหรือ deploy ให้ ผู้ดูแลต้องเตรียม domain, DNS, provider key และสิทธิ์ Docker เอง

## ก่อนเริ่ม

- ใช้ VPS อย่างน้อย 4 GB RAM สำหรับ web, Caddy และ build/deploy tooling
- เปิด firewall เฉพาะ `22/tcp`, `80/tcp` และ `443/tcp`; ห้ามเปิด app port `3000` สู่ public Internet
- สร้าง `/opt/ai-sdk-pro/.env` จาก [`.env.example`](../.env.example) และตั้ง mode `600`
- ค่า `AI_API_KEY`, `ANTHROPIC_API_KEY`, `MCP_AUTH_TOKEN` และ token อื่น ๆ เป็น server-only secrets
- `DIGITALOCEAN_TOKEN` เป็น credential ของ infrastructure/DigitalOcean ไม่ใช่ LLM key

## Start ด้วย Docker Compose

```bash
cd /opt/ai-sdk-pro
cp .env.example .env
chmod 600 .env
$EDITOR .env
set -a; . ./.env; set +a

docker compose --env-file .env -f infra/docker-compose.yml pull
docker compose --env-file .env -f infra/docker-compose.yml up -d
curl --fail --silent --show-error https://"$DOMAIN"/api/health
```

สำหรับเครื่องทดสอบที่ต้อง build จาก source ให้ใช้ `docker compose --env-file .env -f infra/docker-compose.yml up -d --build`; production ควร pull immutable GHCR image จาก workflow แทน

`app` expose แค่ network ภายใน ส่วน Caddy เป็น service เดียวที่ bind `80/443` และ reverse proxy ไป `app:3000` ด้วย `flush_interval -1` เพื่อไม่กัก SSE

ตรวจ config ก่อนเริ่ม production:

```bash
docker compose --env-file .env -f infra/docker-compose.yml config
```

## ดูสถานะและ logs

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs -f --tail=200 app
docker compose --env-file .env -f infra/docker-compose.yml logs -f --tail=200 caddy
docker inspect --format '{{json .State.Health}}' ai-sdk-pro-app-1
```

ชื่อ container อาจต่างตาม project name ให้ใช้คำสั่ง `docker compose ps` ตรวจชื่อจริงก่อน `docker inspect` การทดสอบ stream ควรทำผ่าน HTTPS domain ไม่ใช่ `localhost:3000`:

```bash
curl -N --fail-with-body "https://$DOMAIN/api/chat" \
  -H 'content-type: application/json' \
  -H 'accept: text/event-stream' \
  --data '{"messages":[{"id":"smoke-1","role":"user","parts":[{"type":"text","text":"Say hello in one sentence."}]}]}'
```

## หมุน secrets อย่างปลอดภัย

1. ออก key ใหม่ที่ provider/MCP ก่อน และตรวจว่าใช้ scope ต่ำสุดที่จำเป็น
2. แก้เฉพาะค่าใน `/opt/ai-sdk-pro/.env` ด้วย editor ที่ไม่เขียนลง git
3. ตรวจ permission แล้ว restart app เท่านั้น: `chmod 600 .env && docker compose --env-file .env -f infra/docker-compose.yml up -d --force-recreate app`
4. ตรวจ `/api/health`, ดู logs และทดสอบ chat stream
5. revoke key เดิมหลังยืนยันว่า key ใหม่ทำงาน
6. หาก key เคยหลุด ให้ถือว่า compromised: revoke ทันที, ค้น git/CI logs, rotate ทุก secret ที่เกี่ยวข้อง และอย่าใส่ค่าจริงใน issue หรือ workflow

Caddy ไม่ต้องได้รับ provider keys จึงไม่ควรนำ `.env` ทั้งไฟล์ไปใส่ใน Caddy dashboard หรือ log

## Rollback image

GitHub Actions push ทั้ง `:latest` และ immutable `:sha-<commit>` ไป GHCR ให้เลือก commit ก่อนหน้าแล้วรัน:

```bash
cd /opt/ai-sdk-pro
export GHCR_IMAGE=ghcr.io/your-github-owner/ai-sdk-pro-web:sha-<previous-commit>
docker compose --env-file .env -f infra/docker-compose.yml pull app
docker compose --env-file .env -f infra/docker-compose.yml up -d app
curl --fail --silent --show-error https://"$DOMAIN"/api/health
```

เมื่อแก้เหตุแล้วจึง deploy `main` ล่าสุดกลับมา ห้ามลบ image tag ก่อนตรวจว่า rollback ผ่าน health check

## Fallback แบบ systemd (ไม่ใช้ Docker)

หากใช้ standalone output บนเครื่องโดยตรง ให้สร้าง user ที่ไม่มีสิทธิ์ root, build ด้วย Node 22 และติดตั้ง unit จาก [`ai-sdk-pro.service.example`](./ai-sdk-pro.service.example):

```bash
sudo useradd --system --home /opt/ai-sdk-pro --shell /usr/sbin/nologin aisdk
sudo chown -R aisdk:aisdk /opt/ai-sdk-pro
sudo chmod 600 /opt/ai-sdk-pro/.env
sudo cp infra/ai-sdk-pro.service.example /etc/systemd/system/ai-sdk-pro.service
sudo systemctl daemon-reload
sudo systemctl enable --now ai-sdk-pro
sudo journalctl -u ai-sdk-pro -f
```

ให้ Caddy reverse proxy ไป `127.0.0.1:3000` และไม่เปิด port นี้ที่ firewall

## Liveness, readiness และการทดสอบโมเดล

`/api/health` ตรวจว่า process ทำงาน ส่วน `/api/ready` ตรวจว่ามี runtime provider configuration โดยไม่เรียกโมเดลและไม่รับรองว่า key ใช้งานได้จริง หลัง deploy ให้ทดสอบ `/api/chat` และตรวจ SSE ว่าไม่มี `type: error` พร้อมมีข้อความตอบกลับจากโมเดล การใช้ curl exit code อย่างเดียวไม่พอ เพราะ stream อาจเริ่มที่ HTTP 200 แล้วพบ error ภายหลัง

Caddy overwrite `X-Real-IP` และ Compose ไม่เปิด app port จึงเปิด `TRUST_PROXY=true` ได้อย่างมีขอบเขต หากใช้ proxy อื่นต้อง overwrite identity header และปิด public app port ก่อนเปิดค่านี้ ค่าเริ่มต้นที่ไม่เชื่อ proxy จะใช้ shared anonymous quota 20 คำขอต่อนาที พร้อม process-wide cap 120 คำขอต่อนาทีและ cache ที่มี hard bound สำหรับ public SaaS ต้องเพิ่ม authorization และ distributed limits ก่อนเปิดให้ผู้ใช้ทั่วไป


## Platform Phase 0–6 release procedure (staging branch, 2026-11-17)

The platform modernization is currently under review in
`feat/platform-phases-0-6-20261117`. It is **not** the running VPS release.
The original BYOK route remains the default and must not silently consume the
platform owner's provider key. Never merge or deploy from the feature branch
without the owner's explicit production approval.

### Gate A: Validate exact source and all isolated tests

```bash
git status --short --branch
git log -1 --oneline
git remote -v
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
# This directory is a standalone Node.js test package, not part of pnpm-workspace.yaml.
pnpm -C infra/cloudflare-platform install --no-frozen-lockfile
pnpm -C infra/cloudflare-platform test
pnpm build
```

Only synthetic data must be used for tests. The Cloudflare Worker has a
separate package `apps/agent-worker`; its typecheck/build are included in
Turborepo. A successful TypeScript build alone does not establish that the
Durable Object authentication, WebSocket reconnect or budget accounting pass
runtime tests.

### Gate B: Cloudflare inventory and isolated Keyless Worker

**Do not run these deploy commands until the owner approves the specific
Cloudflare account, budget and hostname.** Read-only inventory comes first:

```bash
pnpm -C apps/agent-worker exec wrangler whoami
pnpm -C apps/agent-worker exec wrangler deployments list
pnpm -C apps/agent-worker exec wrangler r2 bucket list
pnpm -C apps/agent-worker exec wrangler deploy --dry-run --config wrangler.jsonc
```

Review Workers, DO classes/migrations, existing R2 buckets, queues, inference
pricing, account spend notifications and any paid plan minimums. The
`BudgetCoordinator` is intended to reserve a conservative amount for each
request across all threads and users; it is not an invoice-wide spending cap.
Set `AGENT_AUTH_SECRET` on **both** apps/web and the Worker with the same
secure random value (minimum 32 bytes). Never commit or echo the value.
Maintain `ALLOWED_ORIGINS` as a strict allowlist, and verify that the
`CHAT_AGENT` and `BUDGET` bindings reference distinct SQLite DO classes.

After security and billing approval only:

```bash
pnpm -C apps/agent-worker exec wrangler deploy --config wrangler.jsonc
```

Verify `/health` and the following negative cases: unauthorized HTTP/WS
connections return 401, user A cannot route to user B's agent (403), expired
tokens cannot generate new messages, 31st user question is blocked, and
monthly-budget exhaustion prevents model invocation. Run real inference only
with an explicitly approved paid test budget.

Set `NEXT_PUBLIC_CF_AGENT_URL` to the verified HTTPS Worker URL on a new
**test build** only. Next.js `NEXT_PUBLIC_*` values are embedded during build,
not toggled by changing a server environment variable after compilation.

### Gate C: Preview control plane and R2

Existing `infra/cloudflare-platform` is a separate staging control plane
with D1, Queue, Workers for Platforms and private `BUILD_DATA` R2 binding.
Do not recreate it, grant a public bucket, or execute imported source inside
`apps/web`. The `/api/repositories/[id]/preview` handler only records
authorized pinned-SHA intake and reads status from migrations 0007/0008;
`apps/web/scripts/dispatch-preview.ts` performs external GitHub Actions
dispatch with explicit pilot credentials. Review duplicate delivery IDs,
in-flight `uncertain` states, tenant ownership, runner sandbox isolation and
workflow permissions before enabling `auto_deploy`.

The `private-r2-policy.ts` file is a **pure fail-closed boundary**, not an
enabled upload/download API. Storage access is disabled until a private bucket
is inventoried, size limits and repository/thread ownership checks are
implemented around all R2 requests, and the dedicated tests pass.

### Gate D: VPS release and smoke tests

Live infrastructure described in `DEPLOYMENT-STATE.md` uses Caddy as the only
public listener. Keep app port 3000 private and the app filesystem read-only.
Do not confuse Manus Webdev publishing, Cloudflare Worker deployment and
the VPS Docker image: they are independent release paths.

Operator must build a **new immutable** `ai-sdk-pro-web:<approved-sha>` image
from the reviewed source and smoke-test it privately before changing the
Compose `APP_IMAGE`. Production changes require an explicit owner approval.

```bash
cd /opt/ai-sdk-pro
docker compose ps
docker compose config
docker compose logs --tail=100 app caddy
for route in / /templates /chat /docs/getting-started /workspace /login /api/health /api/ready; do
  curl --fail-with-body --silent --show-error "https://ai-sdk.pro${route}" >/dev/null || exit 1
done
curl --fail-with-body --silent https://ai-sdk.pro/api/ready
```

Verify visual font and theme, login, BYOK error sanitization, CSP, ownership
boundaries, real WebSocket authorization, quotas and Stream cancellation in
addition to these GET smoke checks.

### Gate E: Emergency rollback (VPS only)

The last recorded accepted checkpoint in `DEPLOYMENT-STATE.md` is
`ai-sdk-pro-web:bc5aac7` and the other retained image is
`ai-sdk-pro-web:f3ecac1`. Confirm the actual images exist on the VPS first:

```bash
cd /opt/ai-sdk-pro
docker image inspect ai-sdk-pro-web:bc5aac7
docker image inspect ai-sdk-pro-web:f3ecac1
export APP_IMAGE=ai-sdk-pro-web:bc5aac7
docker compose up -d --no-deps app
curl --fail-with-body https://ai-sdk.pro/api/health
curl --fail-with-body https://ai-sdk.pro/api/ready
docker compose logs --tail=100 app caddy
```

Keep the old `APP_IMAGE` Compose configuration consistent with the rollback
after validating health. Do not remove historical images before a successful
smoke test. A VPS rollback does not automatically roll back the separately
deployed Cloudflare Worker or Durable Object schema.
