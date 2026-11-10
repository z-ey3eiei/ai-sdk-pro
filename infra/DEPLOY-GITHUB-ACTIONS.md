# Deploy ด้วย GitHub Actions + GHCR + Docker Compose

งานนี้เตรียม workflow ให้แล้ว แต่ยังไม่ได้เชื่อมต่อ VPS, GHCR หรือ domain จริง ผู้ดูแลต้องสร้าง secrets และลงทะเบียนระบบเอง

## VPS preparation

เตรียม Ubuntu LTS และผู้ใช้ deploy ที่ไม่ใช่ root:

```bash
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 0750 /opt/ai-sdk-pro
```

ติดตั้ง Docker Engine/Compose plugin จากเอกสารทางการรุ่นล่าสุด สร้าง SSH key สำหรับ GitHub Actions แล้วใส่ public key ใน `/home/deploy/.ssh/authorized_keys` ของ VPS โดยจำกัด source IP ตามความเหมาะสม ตั้ง firewall ให้เปิดเฉพาะ `22`, `80`, `443`; ไม่เปิด `3000` และไม่เปิด Coolify dashboard public

วาง repository/ไฟล์ compose ที่ `/opt/ai-sdk-pro`, สร้าง `.env` จาก [`.env.example`](../.env.example), ตั้ง mode `600` และตรวจว่า `DOMAIN`/`ACME_EMAIL` ใช้ได้จริง:

```bash
sudo -u deploy docker compose --env-file /opt/ai-sdk-pro/.env \
  -f /opt/ai-sdk-pro/infra/docker-compose.yml config
```

## GitHub repository secrets

ตั้งค่าที่ **Settings → Secrets and variables → Actions**:

- `SSH_HOST`: hostname หรือ IP ของ VPS
- `SSH_USER`: เช่น `deploy`
- `SSH_KEY`: private key ของ deploy key แบบ multiline
- `DOMAIN`: hostname สำหรับ post-deploy HTTPS health check
- `GHCR_USERNAME`: GitHub user/robot ที่มีสิทธิ์อ่าน package
- `GHCR_TOKEN`: fine-grained token หรือ deploy token ที่มี `read:packages` เท่านั้น

Workflow ใช้ `GITHUB_TOKEN` สำหรับ push image จาก Actions ไป GHCR และใช้ `GHCR_TOKEN` บน VPS สำหรับ pull image จึงไม่ควรใช้ token ที่มีสิทธิ์เกินจำเป็น

หลังตั้งค่า secrets และตรวจ VPS พร้อมแล้ว ให้เปิด repository variable `DEPLOY_ENABLED=true` ที่ Settings → Secrets and variables → Actions → Variables ก่อนหน้านั้น workflow จะถูก skip เพื่อไม่ให้ source push ครั้งแรกสั่ง build/publish image หรือ deploy ภายนอกโดยไม่ตั้งใจ

การ publish SDK เป็นคนละเรื่อง: เปิด `NPM_PUBLISH_ENABLED=true` หลังลงทะเบียน npm Trusted Publisher แล้วเท่านั้น manual npm dry run ยังใช้งานได้โดยไม่ publish package

## Flow

`.github/workflows/deploy.yml` จะทำงานเมื่อ push ไป `main` และ `DEPLOY_ENABLED=true`:

1. checkout source และ lower-case `github.repository_owner`
2. build `infra/Dockerfile` ด้วย Docker Buildx
3. push immutable `ghcr.io/<owner>/ai-sdk-pro-web:sha-<commit>` และ update `:latest`
4. SSH เข้า `/opt/ai-sdk-pro`, login GHCR แล้วรัน `docker compose pull` และ `docker compose up -d`
5. รอ `https://<DOMAIN>/api/ready`; ถ้าไม่เป็น 2xx workflow ล้มเหลว

มี concurrency group เดียวเพื่อไม่ให้ deploy สองชุดทับกัน และไม่มี secret inline ใน workflow

## ตรวจสอบหลัง deploy

```bash
curl --fail --silent --show-error https://<domain>/api/health
curl --fail --silent --show-error https://<domain>/api/ready
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs --tail=200 app
```

ทดสอบ stream ผ่าน domain จริงด้วย `curl -N` ตาม [RUNBOOK](./RUNBOOK.md) เพื่อยืนยันว่า Caddy ไม่ buffer response

## Rollback ภายในห้านาที

เลือก tag ของ commit ก่อนหน้าที่ทราบว่าดี แล้วรันบน VPS:

```bash
cd /opt/ai-sdk-pro
export GHCR_IMAGE=ghcr.io/<owner>/ai-sdk-pro-web:sha-<previous-commit>
docker compose --env-file .env -f infra/docker-compose.yml pull app
docker compose --env-file .env -f infra/docker-compose.yml up -d app
curl --fail --silent --show-error https://<domain>/api/health
```

หลังแก้สาเหตุแล้ว push commit ใหม่ไป `main` เพื่อให้ workflow deploy กลับตามปกติ เก็บ image tag เดิมไว้จนกว่าจะตรวจรับ rollback เสร็จ
