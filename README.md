# ai-sdk.pro

แพลตฟอร์มอิสระสำหรับสร้าง AI agents และเรียกใช้งานผ่าน AI SDK 6 UI Message Stream โดยตั้งใจให้ self-host บน VPS ของผู้ดูแลเอง ไม่ผูกกับ Vercel แชท public ใช้ BYOK: ผู้ใช้เลือกบริการ AI และกรอก API key ของตัวเอง คีย์ของเจ้าของเว็บไม่ถูกส่งให้ผู้ใช้

> ai-sdk.pro เป็นแหล่งข้อมูลและซอฟต์แวร์อิสระ ไม่ใช่เว็บไซต์ทางการของ Vercel โปรดอ้างอิงเอกสารทางการของ AI SDK สำหรับรายละเอียด API รุ่นล่าสุด

## เวอร์ชันเริ่มต้น: v0.1.0

เวอร์ชันตรงกับ root package.json และทุก workspace package ดูประวัติการเปลี่ยนแปลงที่ [CHANGELOG.md](CHANGELOG.md) และ [VERSION](VERSION) Git tag `v0.1.0` ระบุ source ของ release เริ่มต้น

ไฟล์ [`apps/web/components/llm.tsx`](apps/web/components/llm.tsx) เป็นคอมโพเนนต์แชท AI ที่ใช้จริงในหน้า `/chat` รองรับ streaming, tool activity, stop, retry และ new conversation ผู้ใช้กรอกคีย์ผ่านช่องปกปิด ซึ่งเก็บในหน่วยความจำของหน้าเว็บและส่งผ่าน HTTPS ไปยังเซิร์ฟเวอร์สำหรับ request นั้นเท่านั้น:

```tsx
import LLMChat from '@/components/llm';

export default function ChatPage() {
  return <LLMChat api="/api/chat" configApi="/api/config" />;
}
```

หากนำไปวางใน layout ที่มี header อยู่แล้ว ให้ส่ง `showHeader={false}` ห้ามเปลี่ยน `api` เป็น provider endpoint หรือ hardcode คีย์เจ้าของเว็บในคอมโพเนนต์นี้

## BYOK: ผู้ใช้เลือกบริการและกรอกคีย์เอง

รองรับ Anthropic/Claude, OpenAI/GPT และ Google/Gemini โดยเรียก fixed official endpoints ผ่าน AI SDK ฝั่งเซิร์ฟเวอร์ ค่าเริ่มต้น public API ต้องมี `byok: { provider, model, apiKey }` แยกจาก `messages` ทุกครั้ง เก็บคีย์เฉพาะใน page/request memory ไม่เก็บลง localStorage, sessionStorage, cookie, database, log หรือประวัติข้อความ มีปุ่ม Forget key และการเปลี่ยน provider จะล้างคีย์เดิม

การเชื่อมใน UI เป็นการตรวจรูปแบบเท่านั้น ไม่ใช่การรับรองว่าคีย์ใช้ได้และไม่เรียก API จนกดส่งข้อความ Provider เรียกเก็บค่าโมเดลจากบัญชีของผู้ใช้ตามการใช้งานจริง การมี subscription ของ ChatGPT/Claude ไม่ได้เท่ากับมี API credit โมเดลที่ใช้ได้ขึ้นอยู่กับบัญชีและผู้ให้บริการ

Production ใช้ `BYOK_ONLY=true` (เป็นค่าเริ่มต้น) โดยไม่ fallback ไปคีย์ owner/sandbox และไม่เปิด privileged server MCP ให้ visitor requests `/api/ready` ตรวจว่าระบบพร้อมรับ BYOK ได้ ไม่ได้ทดสอบคีย์ของผู้ใช้ `BYOK_ONLY=false` มีไว้เฉพาะ development/การใช้งาน private ที่ตั้งใจใช้ server key เท่านั้น

## ขอบเขตของ foundation ชุดนี้

โค้ดที่มีอยู่จริงในชุดนี้คือ public web/chat foundation, เอกสาร, `@aisdkpro/client` สำหรับ UI Message Stream และไฟล์ self-hosting สำหรับเว็บของโครงการเอง ข้อเสนอเรื่อง public SaaS control plane, build plane, runtime plane, account/tenant/quota API, GitHub App import, Coolify adapter, BYOVPS, isolated user build/runtime, artifact registry, CLI และ deployment API เป็น **สถาปัตยกรรมที่เสนอสำหรับงานถัดไป** ไม่ใช่บริการที่ติดตั้งหรือเชื่อมต่อแล้ว

ดังนั้น SDK ปัจจุบันรองรับการเรียก chat endpoint จริงเท่านั้น ไม่ได้สร้าง deploy/project API จำลอง ไฟล์ Docker/Caddy/GitHub Actions เป็น deployment foundation ส่วนงาน deployment จริงต้องตรวจ source revision, HTTP, DNS และ TLS บนเซิร์ฟเวอร์เป้าหมายก่อนรายงานสำเร็จ ไม่ควรสรุปจากไฟล์ configuration เพียงอย่างเดียว

## พัฒนาใน monorepo

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

โครงสร้างหลัก:

- `apps/web` — Next.js App Router, agent, chat route และ playground
- `apps/docs` — เอกสารภาษาไทยพร้อมตัวอย่างโค้ดภาษาอังกฤษ
- `packages/ui` — shared visual components
- `packages/sdk` — `@aisdkpro/client` แบบ publishable
- `infra` — Docker, Compose, Caddy, systemd fallback และ runbooks
- `infra/workflows` — เทมเพลต GitHub Actions สำหรับ GHCR/SSH deploy และ npm Trusted Publishing; ยังไม่ active

## Client SDK

```bash
pnpm --filter @aisdkpro/client typecheck
pnpm --filter @aisdkpro/client test
pnpm --filter @aisdkpro/client build
pnpm --filter @aisdkpro/client publish:dry-run
```

ตัวอย่างการเรียก endpoint จาก application อื่น:

```ts
import type { UIMessage } from 'ai';
import { ChatClient } from '@aisdkpro/client';

const client = new ChatClient({
  baseUrl: 'https://ai-sdk.pro',
  endpoint: '/api/chat',
});

const messages: UIMessage[] = [{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }];
for await (const event of client.stream(messages, {
  body: { byok: { provider: 'openai', model: 'gpt-5-mini', apiKey: userEnteredKey } },
})) {
  if (event.type === 'text-delta') process.stdout.write(event.delta);
}
```

อ่าน API, browser compatibility และ jsDelivr example ได้ที่ [`packages/sdk/README.md`](packages/sdk/README.md)

## Self-hosting

คัดลอก template แล้วเติมค่าจริงบน server เท่านั้น:

```bash
cp .env.example .env
chmod 600 .env
set -a; . ./.env; set +a
```

ตัวแปร `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `AI_API_KEY`, `ANTHROPIC_API_KEY`, `APP_ORIGINS`, `MCP_SERVER_URL` และ `MCP_AUTH_TOKEN` เป็น server-only configuration DigitalOcean token เป็น credential สำหรับ infrastructure เท่านั้น ไม่ใช่ LLM key และต้องเก็บใน operator secret store แยกจาก app .env และ app container

เริ่มต้นแบบ Docker:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
curl --fail https://$DOMAIN/api/health
```

`app` ไม่ publish port `3000`; มีเพียง Caddy ที่ bind `80/443` และตั้ง `flush_interval -1` สำหรับ SSE ดูขั้นตอน start, logs, secret rotation และ rollback ที่ [`infra/RUNBOOK.md`](infra/RUNBOOK.md)

- [Coolify guide](infra/DEPLOY-COOLIFY.md) — VPS 4 GB, Traefik/HTTPS และ rollback
- [GitHub Actions guide](infra/DEPLOY-GITHUB-ACTIONS.md) — GHCR, SSH deploy และ health check
- [`infra/ai-sdk-pro.service.example`](infra/ai-sdk-pro.service.example) — systemd fallback แบบ unprivileged

## Secrets และการ deploy

ห้าม commit `.env`, API keys หรือใส่ provider values จริงใน README/CI คีย์ของเจ้าของสำหรับ private mode ต้องอยู่ใน runtime secret store ส่วนคีย์ BYOK ของผู้ใช้ต้องอยู่ใน page/request memory เท่านั้น ห้ามคงไว้ใน `.env` หรือฐานข้อมูล ก่อนใช้ npm workflow ผู้ดูแลต้องลงทะเบียน Trusted Publisher บน npmjs.com ด้วย repository และ workflow ที่ถูกต้องเอง; workflow ใน repo ทำหน้าที่ขอ OIDC token และ publish เท่านั้น

Automation เป็น opt-in: ตั้ง repository variable `DEPLOY_ENABLED=true` หลัง VPS/secrets พร้อม หรือ `NPM_PUBLISH_ENABLED=true` หลัง npm Trusted Publisher พร้อมเท่านั้น การพุช source และ tag `v0.1.0` ครั้งแรกไม่เปิด deploy/publish ให้เอง

การ deploy ครั้งนี้ใช้ source archive ผ่าน SSH ไปยัง VPS ใหม่ของเจ้าของ จึงไม่ต้องพึ่ง GitHub login บนเซิร์ฟเวอร์ รายละเอียด server access และ credential ส่งแยกแบบส่วนตัว ไม่ใส่ใน source repo ไม่มีการ publish npm package หรือเปิด CI deployment อัตโนมัติ
