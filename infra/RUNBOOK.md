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
