# ai-sdk.pro — Project Memory & Handoff

อัปเดต 10 พฤศจิกายน 2026 (Asia/Bangkok) ไฟล์นี้เป็น handoff สำหรับผู้ดูแล/agent ที่กลับมาทำงานต่อจากเครื่องหรือเซสชันอื่น ไม่ใช่ secret store และไม่แทนการตรวจสถานะสดก่อนทำงาน

## 1. Repo และวิธีเริ่มงานจากที่อื่น

- **โปรเจกต์:** ai-sdk.pro — AI agent platform, playground, Thai docs และ starter showcase
- **Canonical repo:** private GitHub repo [`z-ey3eiei/ai-sdk-pro`](https://github.com/z-ey3eiei/ai-sdk-pro)
- **Branch หลัก:** `main`; อย่าสร้าง repo ใหม่หรือเปลี่ยน remote เอง
- **Sandbox checkout ที่ใช้ในงานล่าสุด:** `/home/ubuntu/salesdash` (path นี้ใช้ได้เฉพาะเครื่องนี้)
- **ก่อนแก้:** ตรวจ `git status --short --branch`, `git log -1`, `git remote -v`; fetch `origin main` แล้วรักษา commit ของคน/เซสชันอื่นไว้ ห้าม force-push, reset, clean หรือทับงานที่ยังไม่ทราบที่มา
- Repo เป็น private ผู้ทำงานจากเครื่องอื่นต้องมีสิทธิ์เข้าถึงผ่านบัญชี/connector ที่ได้รับอนุญาต อย่าวาง token, private key หรือ `.env` ใน repo/แชต

เริ่มจาก Node.js 22 และ pnpm `10.18.0` ตาม `package.json`/Dockerfile:

```bash
git clone https://github.com/z-ey3eiei/ai-sdk-pro.git
cd ai-sdk-pro
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm dev
```

`pnpm dev` ใช้พัฒนา local เท่านั้น ไม่ใช่การตรวจ production หากมีการเปลี่ยน source ให้รันทดสอบที่เกี่ยวข้องก่อน commit; การทดสอบที่เขียนไว้ไม่อนุญาตให้เขียนลงฐานข้อมูลจริง

## 2. สถานะล่าสุดและ deployment ที่ต้องแยกจากกัน

### GitHub source

ก่อนเพิ่มไฟล์ handoff นี้ source `main` อยู่ที่ commit `80886fe7c39cd7357e6e82a0d929e17ac42a4c4b` (`test: strengthen security boundary coverage`) ใน repo เดิม ผู้ใช้ยืนยันว่าไม่ให้สร้าง repo ใหม่ การเพิ่ม memory นี้จะทำให้มี commit ใหม่ภายหลัง ให้ใช้ `git log -1` ตรวจ SHA ล่าสุด ไม่ใช้ SHA ของ commit ก่อนหน้าแทน

Commit `80886fe` เพิ่ม security route tests, query fixtures สำหรับ tenant isolation, auth/chat/path tests และกรองชื่อ SSH private-key ที่พบบ่อยออกจาก repository snapshot ผลตรวจ ณ commit นั้น: Vitest **76/76 ผ่าน**, `pnpm typecheck` ผ่านทั้ง 4 workspace packages และ `git diff --check` ผ่าน ไม่มีการทดสอบกับ production DB, Cloudflare inference หรือระบบจริง

### Webdev auto-publish

Webdev project ที่ผูกกับ repo คือ `wdp_dc48b360c1e3edf42b1e7395`; โดเมน managed ที่ทราบคือ `salesdash-cww5r92n.manus.space` และ `publishing.auto_publish=true` การ push ไป canonical `main` ทำให้ระบบบันทึก checkpoint และส่ง Webdev auto-publish โดยอัตโนมัติ งานล่าสุดระบบแจ้งว่า checkpoint ถูกบันทึกและส่ง auto-publish แล้ว แต่ยังไม่มีหลักฐานใน handoff นี้ว่าการเผยแพร่เสร็จสมบูรณ์ ให้ตรวจ Dashboard ก่อนอ้างว่าสำเร็จ และอย่าส่ง MCP publish ซ้ำสำหรับ checkpoint เดิม

**สำคัญ:** Webdev auto-publish เป็นคนละเส้นทางกับ production VPS `https://ai-sdk.pro` ไม่ถือว่าการ push หรือ Webdev publish เปลี่ยน runtime บน VPS แล้ว

### VPS / Cloudflare runtime

ข้อมูลปฏิบัติการล่าสุดที่บันทึกไว้ใน [`infra/DEPLOYMENT-STATE.md`](infra/DEPLOYMENT-STATE.md) ระบุ VPS runtime image เป็น `ai-sdk-pro-web:0293758`, BYOK mode, Docker/Caddy และ Cloudflare DNS/HTTPS ผ่านการตรวจใน release นั้นแล้ว การเปลี่ยน commit `80886fe` เป็น security test/snapshot-filter work ไม่ได้ deploy VPS และห้ามกล่าวว่า VPS ใช้ source ใหม่นี้จนกว่าจะตรวจ release/runtime จริง

สำหรับการดูแล VPS ให้เริ่มจาก `infra/RUNBOOK.md`, `infra/DEPLOYMENT-STATE.md` และคู่มือ operator; private key/SSH credentials ส่งแยกและต้องไม่ commit โฟลเดอร์ `.env` หรือ credentials ใด ๆ ไฟล์ `/home/ubuntu/ai-sdk-pro-vps-handoff.md` อยู่นอก repo และเป็นเอกสารเดิม; ข้อมูล repo-access ในไฟล์นั้นอาจเก่ากว่า memory นี้

## 3. สิ่งที่มีอยู่ใน source ปัจจุบัน

- Public chat ใช้ **BYOK**: ผู้ใช้เลือก Anthropic/OpenAI/Google และให้ provider key ของตนเอง คีย์ไม่ใช่ owner key และต้องไม่ persist ใน browser storage, DB, logs, URL หรือ message parts
- GitHub login, Neon-backed personal workspace, repository import แบบ read-only, session idle policy 3 ชั่วโมง และ per-user ownership checks
- หน้า templates 3 แบบ (`streaming-chat`, `docs-assistant`, `agent-launchpad`), ZIP downloads และคู่มือภาษาไทย
- security coverage ล่าสุดอยู่ใน `apps/web/app/api/security-boundaries.test.ts`, `apps/web/lib/repository-queries.test.ts`, `apps/web/lib/auth-policy.test.ts`, `apps/web/lib/chat-policy.test.ts`, `apps/web/lib/github/repositories.test.ts` และ `apps/web/lib/repository-snapshot.test.ts`
- การเปลี่ยน snapshot filter อยู่ใน `apps/web/lib/repository-snapshot.ts`; chat/provider หลักอยู่ใน `apps/web/lib/provider.ts`, `apps/web/app/api/chat/route.ts` และ `apps/web/components/llm.tsx`
- `apps/web` คือ Next.js web app; `apps/docs` คือ Fumadocs; `packages/sdk` คือ `@aisdkpro/client`; `packages/ui` คือ shared UI; `starters/` เก็บ starter source; `infra/` และ `scripts/` เก็บ operator/configuration/package tooling

อ่าน [`README.md`](README.md), [`TODO.md`](TODO.md) และ [`plan.md`](plan.md) ประกอบกันด้วย เอกสารเหล่านั้นมีบันทึกตามเวลาและบางย่อหน้าเป็นประวัติ ณ เวลาที่เขียน; หากขัดกับสถานะสดใน GitHub/Dashboard/VPS ให้บันทึกวันที่และแหล่งตรวจสอบใหม่แทนการเชื่อข้อความเก่าโดยอัตโนมัติ

## 4. Next phase ที่เจ้าของอนุมัติแล้ว แต่ยังไม่ได้สร้าง

เจ้าของอนุมัติให้เปลี่ยนเฉพาะ chat ของ **ai-sdk.pro** จาก BYOK-only เป็น owner-funded keyless chat โดยผู้ใช้ไม่ต้องใส่ provider key เป้าหมาย:

1. ใช้ Cloudflare Workers AI model `@cf/zai-org/glm-4.7-flash` ภายใต้งบ inference ที่อนุมัติ **ไม่เกิน $5/เดือน**
2. ใช้ Cloudflare Agents SDK `AIChatAgent` (`@cloudflare/ai-chat`) และ Durable Objects/SQLite เพื่อเก็บ conversation history ให้คงอยู่แม้ login session idle หมดอายุหลัง 3 ชั่วโมง
3. ผูกทุก agent/thread เข้ากับ authenticated user; ห้ามใช้ Durable Object instance/room เดียวร่วมกันจนข้อมูลหรือ stream ข้าม tenant
4. quota เริ่มต้น 30 คำถามต่อผู้ใช้ต่อวัน พร้อม global inference-budget guard, input/context/output/time/concurrency limits และ abuse protection; client ห้ามเป็นผู้กำหนด user identity หรือ budget
5. สร้าง private R2 bucket เฉพาะเมื่อจำเป็นสำหรับ attachments/archive; R2 ไม่ใช่ chat-history store และห้ามเปิด public access
6. ทำ private end-to-end tests เรื่อง auth, tenant isolation, persistent history/reconnect, quota, budget stop, input bounds, cancellation และ R2 authorization ก่อนเปิด public

**สถานะ:** ยังไม่มี keyless worker/bucket/public endpoint จากการตรวจล่าสุด; ยังไม่มี inference ถูกเรียกในงาน research; chat ที่มีอยู่ยังเป็น BYOK; ยังไม่ได้ย้ายหรือคัดลอกข้อมูล Neon การอนุมัติ scope ไม่ใช่หลักฐานว่าทรัพยากรถูก provision หรือฟีเจอร์พร้อมใช้

### ราคา/ข้อเท็จจริงที่ตรวจไว้ (10 พ.ย. 2026 — ต้องตรวจซ้ำก่อนเปิด billing)

- Cloudflare Workers AI free allocation ที่อ่านไว้คือ 10,000 neurons/วันต่อบัญชีร่วม ไม่ใช่ unlimited; overage ที่หน้า pricing ระบุ $0.011 ต่อ 1,000 neurons
- Model API listing ที่ตรวจได้ให้ GLM 4.7 Flash ราว $0.0605 ต่อ 1M input tokens และ $0.400 ต่อ 1M output tokens; Cloudflare pricing docs แสดง input ประมาณ $0.060 จึงใช้ราคาปัจจุบัน/แบบ conservative ก่อนตั้ง budget
- R2 free allowance ที่อ่านไว้คือ 10 GB-month, 1M Class A และ 10M Class B operations ต่อเดือน; อัตราที่แสดง $0.015/GB-month, $4.50/M Class A, $0.36/M Class B; allowance ใช้ร่วมระดับบัญชี และ Durable Objects มีค่าใช้จ่ายแยก
- Read-only bucket-name scan หา bucket ชื่อ `ai-sdk` ไม่พบ แต่ **ไม่ได้ยืนยันว่า account ไม่มี bucket อื่น**; ตรวจ inventory จริงก่อนสร้างหรือผูก resource

แหล่งทางการที่ใช้ใน research: [AIChatAgent / Chat Agents](https://developers.cloudflare.com/agents/agent-class/communication-channels/chat/chat-agents/), [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/). ราคากับ free allocation เปลี่ยนได้ ให้ตรวจซ้ำก่อน provision/inference

ไฟล์ research รุ่นก่อนอยู่ที่ `/home/ubuntu/ai-platform-deploy/keyless-chat-research.md` นอก repo; เนื้อหาสำคัญและแหล่งอ้างอิงถูกรวมไว้ที่นี่เพื่อให้เซสชันอื่นไม่ต้องพึ่งไฟล์นอก repo

## 5. ขอบเขตที่ห้ามลืม

- **ห้ามแก้ `devstack.bid` services หรือ reference repository**; ai-sdk.pro และ DevStack เป็นคนละระบบ ห้ามคัดลอก worker/deploy engine หรือส่ง credentials ข้ามกัน
- ห้ามสร้าง repo ใหม่, VPS ใหม่ หรือเปลี่ยน Cloudflare plan โดยไม่มีคำสั่ง/อนุมัติเพิ่มเติม; ห้ามใช้เงินเกินงบ inference $5/เดือนที่อนุมัติ
- ห้ามรัน imported repository code บน web app container หรือให้ untrusted code เข้าถึง Docker socket, Neon, GitHub, SSH/admin keys
- ห้ามทำให้ BYOK chat ปัจจุบัน fallback ไป owner key ระหว่างยังไม่ได้ทดสอบ/เปลี่ยนตาม scope ที่อนุมัติ
- ไม่รันทดสอบ production หรือเขียนฐานข้อมูลที่ shared ระหว่าง dev/test/prod; ใช้ synthetic/local fixtures เท่านั้นจนมีการอนุมัติและขอบเขตทดสอบจริง
- รักษาดีไซน์ black/red ปัจจุบันและโครงหน้าเดิม ห้ามออกแบบหน้าแรกใหม่
- ห้ามใส่ token, provider key, `.env`, SSH private key, session cookie หรือ OAuth secret ใน Git/เอกสาร
