# Deploy ด้วย Coolify บน VPS ของผู้ดูแล

คู่มือนี้เป็นแนวทางสำหรับ VPS ของผู้ดูแลเองขนาดอย่างน้อย 4 GB RAM งานนี้ไม่ได้ติดตั้งหรือเข้าถึง VPS จริงให้

## 1. เตรียมเครื่องและความปลอดภัย

1. ติดตั้ง Ubuntu LTS, อัปเดตแพ็กเกจ และสร้างผู้ดูแลที่ใช้ SSH key เท่านั้น
2. ตั้ง firewall ให้รับเฉพาะ `22/tcp`, `80/tcp` และ `443/tcp`; ห้ามเปิด Coolify dashboard port ออก public
3. ตั้ง DNS `A/AAAA` ของ `DOMAIN` ให้ชี้ VPS และตรวจว่าไม่มี proxy ที่ buffer SSE
4. ติดตั้ง Coolify จากเอกสารรุ่นล่าสุดของโครงการบน VPS แล้วเข้า panel ผ่าน SSH tunnel หรือ private network ก่อน
5. อัปเดต Coolify และ base images เป็นประจำ อย่านำ dashboard ไปวางบน public hostname ที่ไม่มี access control

ตัวอย่างการตรวจ firewall:

```bash
sudo ufw default deny incoming
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. สร้าง resource จาก Git

1. ใน Coolify สร้าง Project และเลือก **New Resource → Application → Git Repository**
2. เลือก repository และ branch `main`
3. ตั้ง build/deploy เป็น Dockerfile และระบุ path `infra/Dockerfile` โดย build context เป็น repository root (`.`)
4. ใช้ Node 22 image ที่ Dockerfile กำหนดและตรวจว่า health path คือ `/api/health`
5. เปิด auto-deploy เมื่อมี push ไป `main` หลังทดสอบ webhook แล้ว

Dockerfile นี้ compile `@aisdkpro/web` ด้วย `pnpm --filter @aisdkpro/web build` และใช้ Next standalone ที่รันเป็น user `nextjs` ซึ่งไม่ใช่ root

## 3. Environment ใน Coolify UI

ใส่ค่าจริงเฉพาะใน Environment Variables/Secrets ของ Coolify ไม่ใส่ใน repository:

- `AI_PROVIDER=anthropic`
- `AI_MODEL=claude-sonnet-4-6`
- `AI_BASE_URL` เป็น vendor endpoint ที่เลือก
- `AI_API_KEY` หรือ `ANTHROPIC_API_KEY`
- `APP_ORIGINS=https://<domain>`
- `MCP_SERVER_URL` และ `MCP_AUTH_TOKEN` เมื่อเปิดใช้ MCP เท่านั้น
- `DOMAIN` และ `ACME_EMAIL`

ทุก model/provider variable เป็น server-only ห้ามใช้ `NEXT_PUBLIC_` และห้าม copy platform development values มาเป็น production secret `DIGITALOCEAN_TOKEN` ใช้สำหรับ infrastructure ของ DigitalOcean เท่านั้น ไม่ใช่ LLM key

## 4. Traefik และ HTTPS

Coolify มักจัดการ Traefik ให้เอง ให้เลือกหนึ่งทางเท่านั้น:

- ถ้า Coolify/Traefik เป็น edge proxy ให้ map internal app port `3000`, ตั้ง domain และเปิด Let’s Encrypt ใน panel; อย่าเปิด port `3000` บน host
- ถ้าใช้ `infra/docker-compose.yml` แบบเต็ม ให้ใช้ Caddy เป็น edge proxy และอย่าให้ Traefik กับ Caddy แย่ง bind `80/443`

ตรวจว่า route `/api/chat` ส่ง response streaming โดยไม่เปิด buffering/compression ที่ทำให้ chunk ค้าง สำหรับ Caddy ในไฟล์นี้กำหนด `flush_interval -1`; สำหรับ Traefik ให้ตรวจ buffering middleware และ timeout ตามรุ่นที่ติดตั้ง

## 5. Deploy และตรวจรับ

กด Deploy ใน Coolify หรือ push ไป `main` เมื่อเปิด auto-deploy แล้วตรวจ:

```bash
curl --fail --silent --show-error https://<domain>/api/health
curl -N https://<domain>/api/chat \
  -H 'content-type: application/json' \
  -H 'accept: text/event-stream' \
  --data '{"messages":[{"id":"smoke-1","role":"user","parts":[{"type":"text","text":"Say hello in one sentence."}]}]}'
```

เปิด logs ใน Coolify และตรวจว่าไม่มี provider key, Authorization header หรือ MCP secret ปรากฏใน log

## 6. Rollback

ใน Coolify เปิด deployment history เลือก deployment/commit ก่อนหน้าที่ผ่าน health check แล้วกด **Redeploy** หากต้องทำผ่าน Git ให้ checkout/revert commit ที่มีปัญหาแล้ว push ไป branch ที่ตั้ง deploy ไว้ ห้าม force-push production history สำหรับกรณีฉุกเฉินให้รักษา image/commit ปัจจุบันไว้จนกว่าจะยืนยันว่า rollback สำเร็จ
