# content.md — แบบกำหนดการและชุดคำสั่ง AI ฉบับเต็มสำหรับโครงการ ai-sdk.pro

## 1. วิธีใช้เอกสารนี้ (วิธีสั่ง AI)

เอกสารนี้ออกแบบให้วางลงใน repository เป็นไฟล์ชื่อ `content.md` (หรือคัดลอกเนื้อหาไปรวมไว้ใน `AGENTS.md` / `CLAUDE.md` / `.cursorrules` ก็ได้ เพราะเครื่องมือเหล่านั้นอ่านไฟล์กำกับนโยบายระดับ repository โดยอัตโนมัติ) หลักการสั่งงาน AI มีห้าข้อ:

1. สั่งทีละเฟส ไม่สั่งทั้งโครงการในครั้งเดียว เพราะ AI ทำงานได้ดีที่สุดเมื่อขอบเขตหนึ่งคำสั่งมีขนาดพอที่จะตรวจสอบได้
2. ก่อนเริ่มแต่ละเฟส ให้วางข้อความจากส่วน "คำสั่งสำเร็จรูป" ของเฟสนั้นลงในหน้าต่างสนทนาของ AI ได้โดยตรง
3. หลัง AI แจ้งเสร็จแต่ละเฟส ให้สั่งตรวจรับด้วยเกณฑ์ที่กำหนดไว้ท้ายเฟสนั้น หากไม่ผ่านให้ส่งคำสั่งแก้ไขจากส่วน 8
4. ห้ามส่งคีย์หรือข้อมูลลับใดในคำสั่ง AI ทุกค่าที่เป็นความลับต้องเข้าผ่านไฟล์ `.env` บนเครื่องเท่านั้น
5. คำสั่งสำเร็จรูปเขียนเป็นภาษาอังกฤษเพราะโมเดลเขียนโค้ดทำงานได้เสถียรที่สุด ส่วนคำอธิบายรอบ ๆ เป็นภาษาไทยเพื่อให้ผู้ดูแลเข้าใจ

## 2. บริบทโครงการ

โครงการ ai-sdk.pro คือเว็บไซต์เปิดสาธารณะบน VPS ที่นำเสนอและให้บริการ AI agents ตามแนวทาง Vercel AI SDK 6 โดยมีองค์ประกอบหลักสี่ด้าน:

1. เว็บแอปพลิเคชัน Next.js ที่มี chat endpoint รองรับ streaming และ agent ที่นิยามด้วย ToolLoopAgent
2. เอกสาร (docs) ที่มีดีไซน์และโครงเรื่องแบบ turborepo.dev สร้างด้วย Fumadocs
3. client SDK ที่เผยแพร่เป็นแพ็กเกจ npm เพื่อให้นักพัฒนานำไปต่อกับ endpoint ของเว็บ
4. สายการดีพลอยจาก Git: การ push ไปยัง branch หลักต้องส่งผลให้เว็บบน VPS ปรับปรุงอัตโนมัติ (ผ่าน Coolify หรือ GitHub Actions + Docker + Caddy)

ข้อกำหนดตายตัว: ระบบรันบน VPS ที่ผู้ใช้ดูแลเอง ไม่ผูกติดกับแพลตฟอร์ม Vercel และทุกคีย์ของผู้ให้บริการโมเดลต้องอยู่เฉพาะฝั่งเซิร์ฟเวอร์

## 3. สถาปัตยกรรมและเทคโนโลยีที่กำหนดไว้ล่วงหน้า

| ส่วนประกอบ | เทคโนโลยีที่เลือก | เหตุผล |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | จัดการ apps และ packages ร่วมกัน สอดคล้องแนวทาง turborepo.dev |
| เว็บแอป | Next.js (App Router) + TypeScript | รองรับ route handler และ standalone output สำหรับ Docker |
| AI layer | `ai` (Vercel AI SDK 6) + `@ai-sdk/mcp` | ToolLoopAgent, tools, streaming ครบชุด |
| Client SDK | `@ai-sdk/react` useChat + custom transport | สอดคล้องโปรโตคอล UIMessage stream |
| เอกสาร | Fumadocs (MDX) | ปรับแต่งดีไซน์แบบ shadcn ได้อิสระ รองรับ RSC |
| ดีไซน์ | Tailwind CSS v4 + โทเคนดีไซน์แบบ turborepo.dev | ดูหัวข้อ 6.4 |
| การบรรจุ | Docker (Next.js standalone) | ใช้งานบน VPS ใดก็ได้ |
| Reverse proxy | Caddy (หรือ Traefik หากใช้ Coolify) | HTTPS อัตโนมัติ ไม่ buffer สตรีมโดยค่าปริยาย |
| การดีพลอย | Coolify หรือ GitHub Actions + GHCR + docker compose | deploy จาก git push โดยตรง |

## 4. โครงสร้าง repository เป้าหมาย

```text
ai-sdk-pro/
├─ apps/
│  ├─ web/                  # เว็บหลัก (Next.js): landing + chat + playground
│  │  ├─ app/
│  │  │  ├─ page.tsx        # หน้าแรกแบบ turborepo.dev
│  │  │  ├─ chat/page.tsx   # หน้าแชทใช้ useChat
│  │  │  └─ api/chat/route.ts
│  │  ├─ agents/            # หรือวางที่ lib/agents ก็ได้ตามที่ AI เสนอ
│  │  │  ├─ assistant-agent.ts
│  │  │  └─ tools/
│  │  └─ next.config.ts     # output: 'standalone'
│  └─ docs/                 # เอกสารด้วย Fumadocs
│     └─ content/docs/*.mdx
├─ packages/
│  ├─ ui/                   # คอมโพเนนต์ร่วม (ปุ่ม การ์ด บล็อกโค้ด)
│  └─ sdk/                  # client SDK สำหรับเผยแพร่ npm (@aisdkpro/client)
├─ infra/
│  ├─ Dockerfile
│  ├─ docker-compose.yml
│  └─ Caddyfile
├─ turbo.json
├─ pnpm-workspace.yaml
├─ content.md               # เอกสารนี้
└─ .github/workflows/deploy.yml
```

## 5. กฎเหล็กที่ AI ต้องปฏิบัติทุกเฟส

วางกฎนี้ไว้ต้นไฟล์เสมอ AI ทุกตัวจะปฏิบัติตาม:

```text
RULES (apply to every task in this repository):
1. Never commit secrets, API keys, or .env files. Use environment variables only.
2. All LLM provider keys and agent logic must stay server-side. Nothing sensitive in client bundles.
3. Use TypeScript strict mode. No `any` in exported APIs.
4. Follow the exact directory structure in content.md section 4 unless I approve a change.
5. After finishing each phase, list the files created/changed and how to verify locally.
6. If a required dependency version conflicts with another, stop and ask me instead of guessing.
7. Every streaming-related change must keep SSE working end-to-end (no buffering anywhere in the path).
```

## 6. คำสั่งสำเร็จรูปแยกตามเฟส

### เฟส 0 — ตั้งโครง monorepo

```text
Read content.md in this repository first, then set up the monorepo foundation:
1. Initialize a pnpm workspaces + Turborepo monorepo with TypeScript strict mode, following the structure in content.md section 4 (apps/web, apps/docs, packages/ui, packages/sdk).
2. apps/web: a minimal Next.js App Router app with output: 'standalone' in next.config.ts.
3. apps/docs: a minimal Fumadocs site that builds successfully.
4. packages/ui: an empty component package with Tailwind CSS v4 configured.
5. Add turbo tasks for dev, build, lint, typecheck that respect dependency order.
Do not implement any AI features yet. When done, print the exact commands I should run to verify.
```

เกณฑ์ตรวจรับเฟส 0: `pnpm install && pnpm build` ผ่านทั้ง repository, เปิด `apps/web` แล้วเห็นหน้าเริ่มต้น

### เฟส 1 — นิยาม Agent

```text
Implement the agent layer in apps/web per content.md:
1. Create agents/assistant-agent.ts using ToolLoopAgent from the `ai` package (AI SDK 6):
   - model from env var AI_MODEL (default "anthropic/claude-sonnet-4.5")
   - instructions: a helpful assistant for the ai-sdk.pro website, concise answers, cite tool results
   - tools: create three example tools in agents/tools/: getCurrentTime, fetchUrl (fetch a URL, truncate to 8000 chars), searchDocs (search a local JSON index of our docs)
   - each tool uses tool() with inputSchema (zod) and a clear description
   - stopWhen: explicit step limit of 20
   - export type AssistantUIMessage = InferAgentUIMessage
2. Add one MCP tool integration via @ai-sdk/mcp connecting to an env-configured MCP server URL, with the client properly closed after each run.
3. Keep all provider credentials server-side via env vars.
When done, write a small Node script that runs the agent headlessly with a test prompt so I can verify without the UI.
```

เกณฑ์ตรวจรับเฟส 1: สคริปต์ทดสอบรันแล้ว agent เรียกเครื่องมืออย่างน้อยหนึ่งตัวและตอบกลับเป็นข้อความ, ไม่มีคีย์ใดปรากฏในโค้ด

### เฟส 2 — Chat route และการสตรีม

```text
Wire the agent into a public chat endpoint in apps/web:
1. Create app/api/chat/route.ts as a POST handler that:
   - parses UIMessages from the request body
   - returns createAgentUIStreamResponse({ agent: assistantAgent, uiMessages })
2. Add basic protection for a public endpoint: an allowlist of origins, a simple in-memory rate limit per IP (e.g. 20 requests/minute), and request timeout handling.
3. Make sure AbortSignal from the client cancels the model stream (stop button support).
4. Do not add any UI yet — verify with curl that POST /api/chat streams SSE chunks back.
```

เกณฑ์ตรวจรับเฟส 2: `curl -N -X POST localhost:3000/api/chat` พร้อม body ข้อความแล้วได้ chunk ไหลทีละส่วน มิใช่รอจบทั้งก้อน

### เฟส 3 — หน้าแชทและดีไซน์แบบ turborepo.dev

```text
Build the chat UI and the visual design system:
1. Design tokens: implement a turborepo.dev-inspired theme in packages/ui — dark-first palette, large tight hero typography, monospace command blocks with a copy button, feature cards with live terminal-style examples, a stats row (downloads, GitHub stars).
2. apps/web/app/page.tsx: hero with one-line headline ("Your agents, one endpoint" or similar), an install command block (npm install @aisdkpro/client), and feature cards for Agents, Docs, and Git Deploys.
3. apps/web/app/chat/page.tsx: a chat page using useChat from @ai-sdk/react with DefaultChatTransport pointing to /api/chat. Render messages via message.parts (text and tool parts). Show streaming status, a stop button, and an error state with retry.
4. Reuse components from packages/ui only — no duplicated styling between apps.
```

เกณฑ์ตรวจรับเฟส 3: พิมพ์ข้อความในหน้าแชทแล้วคำตอบไหลทีละโทเคน กด Stop ได้ ดีไซน์หน้าแรกมีองค์ประกอบครบตามหัวข้อ 6.4 ของรายงานวิจัย (hero, สถิติ, การ์ดฟีเจอร์, บล็อกคำสั่ง)

### เฟส 4 — เว็บเอกสาร

```text
Build the documentation site in apps/docs with Fumadocs:
1. Docs pages: Getting Started, Defining Agents (ToolLoopAgent, tools, stopWhen, MCP), Client SDK reference, Self-Hosting on a VPS, Git Deploys. Write content in Thai with English code samples.
2. Every page must have working code blocks that use the actual APIs from our repo.
3. Add a copy-to-clipboard and file-name label on code blocks.
4. Generate llms.txt at the site root listing all docs pages in Markdown, like ai-sdk.dev does.
5. Add an OG image per section and correct metadata so links preview well.
```

เกณฑ์ตรวจรับเฟส 4: เอกสารทุกหน้าเรนเดอร์ได้ ค้นหาในเอกสารได้ `llms.txt` เข้าถึงได้จากรากเว็บ

### เฟส 5 — Client SDK

```text
Create the publishable client SDK in packages/sdk (package name @aisdkpro/client):
1. Framework-agnostic core: a ChatClient class wrapping fetch to POST /api/chat with UIMessage bodies, streaming SSE parsing, AbortSignal support, and typed events.
2. Thin React binding: a useAISDKProChat hook re-exporting useChat preconfigured with DefaultChatTransport to a configurable base URL.
3. Zero runtime dependencies except tiny peer deps; TypeScript strict; full .d.ts types.
4. Add a browser support note in the README and jsDelivr usage example for a script-tag build.
5. Set up Trusted Publishing to npm via GitHub Actions OIDC (workflow file only; I will register it on npmjs.com myself).
```

เกณฑ์ตรวจรับเฟส 5: build แพ็กเกจได้ example ใน README ต่อ endpoint จริงได้ types ครบถ้วน

### เฟส 6 — Docker และ VPS

```text
Containerize for a public VPS in infra/:
1. Dockerfile for apps/web: multi-stage, Node 22, using Next.js standalone output, running as non-root, with a healthcheck.
2. docker-compose.yml: web app + Caddy. Caddyfile must reverse-proxy to the app with automatic HTTPS and no response buffering (flush_interval -1 on the proxy is fine).
3. Add env file template .env.example listing every required variable with comments (AI provider keys, MCP server URL, AI_MODEL).
4. Add PM2 fallback notes OR a systemd unit file alternative in infra/ for non-Docker setups.
5. Include a short runbook: how to start, how to rotate secrets, how to read logs.
```

เกณฑ์ตรวจรับเฟส 6: `docker compose up` ขึ้นบนเครื่องทดสอบได้ ทดสอบสตรีมจากภายนอกเครื่อง (ผ่านโดเมนหรือ IP จริง) แล้วคำตอบยังไหลทีละโทเคน

### เฟส 7 — สายดีพลอยจาก Git

ทางเลือก ก (Coolify — เลือกเมื่อต้องการ UI ควบคุม):

```text
Write a Coolify deployment guide in infra/DEPLOY-COOLIFY.md for my VPS:
1. Assume a clean VPS with 4 GB RAM. Cover: Coolify install, creating the project from my Git repo, build with the Dockerfile in infra/, setting environment variables in the Coolify UI, Traefik + HTTPS setup, and enabling deployments from the main branch.
2. Include a security checklist: keep Coolify updated, never expose the dashboard port publicly, use the firewall to allow only 80/443/SSH.
3. Add a rollback section: how to redeploy the previous commit from the Coolify UI or CLI.
```

ทางเลือก ข (GitHub Actions — เลือกเมื่อต้องการความโปร่งใส):

```text
Create .github/workflows/deploy.yml for git-push deploys:
1. Trigger on push to main. Build the Docker image for apps/web, push to GHCR (ghcr.io/<owner>/ai-sdk-pro-web).
2. SSH into the VPS (secret: SSH_HOST, SSH_USER, SSH_KEY), run docker compose pull && docker compose up -d in /opt/ai-sdk-pro.
3. Add concurrency so only one deploy runs at a time, and a post-deploy healthcheck that curls https://<domain>/api/health and fails the workflow on error.
4. Write infra/DEPLOY-GITHUB-ACTIONS.md covering VPS preparation (user, SSH key, docker, Caddy, .env) and rollback to the previous image tag.
Also add a simple GET /api/health route in apps/web returning { status: "ok" }.
```

เกณฑ์ตรวจรับเฟส 7: push ขึ้น branch หลักแล้วเว็บบน VPS ปรับปรุงอัตโนมัติ และกู้คืนกลับเวอร์ชันก่อนหน้าได้ภายในห้านาที

## 7. เกณฑ์การตรวจรับรวมของทั้งโครงการ

1. การสตรีมทำงานครบสายจริง: เบราว์เซอร์ → Caddy → Next.js → ผู้ให้บริการโมเดล โดยไม่มีการกักบรรจุที่ใด
2. ไม่มีความลับใดใน git history (ตรวจด้วยการค้นหารูปแบบคีย์ทั่วไปทั้ง repository)
3. `pnpm build` และ `pnpm typecheck` ผ่านทุกแพ็กเกจ
4. หน้าเอกสารเปิดได้ทุกหน้า ค้นหาได้ `llms.txt` ตอบ 200
5. `npm publish --dry-run` ของ packages/sdk ผ่าน
6. การดีพลอยจาก git push ทำงานได้จริงและมี healthcheck
7. แดชบอร์ดการดูแลระบบ (หากใช้ Coolify) ไม่เปิดสู่สาธารณะ

## 8. คำสั่งติดตามผลที่ควรใช้ซ้ำ

เมื่อพบปัญหา ให้ส่งคำสั่งลักษณะนี้แทนการอธิบายยาว ๆ:

- สั่งแก้สตรีมค้าง: `Streaming works locally but stalls behind Caddy on the VPS. Audit the full proxy path for buffering, fix it, and show me the exact lines you changed.`
- สั่งตรวจความปลอดภัย: `Audit this repo for anything that could leak provider keys or expose the agent endpoint to abuse (missing rate limit, CORS, auth). Output a table of findings ordered by severity.`
- สั่งทบทวนเฟสที่แล้ว: `Re-read content.md phase N acceptance criteria, verify each one against the current code, and fix only what fails. Do not refactor anything else.`
- สั่งเขียนเอกสารใหม่: `Draft docs page X for apps/docs in Thai with runnable English code examples, following the tone and structure of the existing pages.`
- สั่งย่อขอบเขต: `This phase is too large. Split it into the smallest safe sub-steps and show me the plan before writing any code.`

## 9. ข้อควรระวังที่ต้องย้ำกับ AI ทุกครั้งที่เริ่มสนทนาใหม่

1. ย้ำว่า AI SDK มีการเปลี่ยนแปลง API ระหว่างรุ่น (เช่น stepCountIs กับ isStepCount และ inputSchema ที่มาแทน parameters) ให้ AI ตรวจเวอร์ชันที่ติดตั้งจริงใน `pnpm-lock.yaml` ก่อนเขียนโค้ดเสมอ
2. ห้ามให้ AI สร้างไฟล์ `.env` ที่มีค่าจริง ให้สร้าง `.env.example` เท่านั้น
3. หากใช้ Coolify หรือ Dokploy ให้ย้ำเรื่องการอัปเดตเวอร์ชันล่าสุดและการปิดแดชบอร์ดจากภายนอกทุกครั้ง เนื่องจากทั้งสองเครื่องมือมีประวัติ CVE ปี 2026 ที่สำคัญ
4. ประเด็นชื่อแบรนด์: หากหน้าเว็บจะอ้างอิง AI SDK ของ Vercel ให้ระบุชัดเจนว่า ai-sdk.pro เป็นแหล่งข้อมูลอิสระ มิใช่เว็บทางการของ Vercel และให้ลิงก์ไปยังเอกสารทางการเป็นแหล่งอ้างอิงหลัก