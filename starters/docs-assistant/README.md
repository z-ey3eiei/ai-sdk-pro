# Docs Assistant starter

ตัวอย่าง Next.js App Router + TypeScript strict ที่สตรีม UI message ด้วย AI SDK 6 จริง ใช้ `ToolLoopAgent` และ tool `searchKnowledge` เพื่อค้น snippet ใน `lib/knowledge.ts` แบบ keyword search ในเครื่อง มี source id กลับมาให้ agentอ้างอิง ไม่ได้สร้าง vector database และไม่อ้างว่าเป็น RAG เต็มระบบ

## เริ่มใช้งาน

ต้องมี Node.js 22 และ npm:

```bash
unzip docs-assistant-*.zip
cd docs-assistant
npm install
npm run dev
```

เปิด `http://localhost:3000` แล้วใส่ OpenAI API key ใน masked input กด **Connect in memory** ก่อนส่งข้อความ การ connect เป็นการตรวจรูปแบบในหน้าเว็บเท่านั้น ไม่ได้ยิงไป OpenAI จนกว่าจะส่งข้อความจริง

แก้ snippets ของคุณได้ที่ `lib/knowledge.ts` แล้วตรวจ production build:

```bash
npm run build
npm run start
```

ถ้าโฮสต์ที่ origin อื่น ให้คัดลอก `.env.example` เป็น `.env.local` และตั้ง `APP_ORIGIN` เป็น origin แบบตรงตัว เช่น `https://docs.example.com` ห้ามใส่ secret ในไฟล์นี้

## บทเรียนสั้น ๆ

`searchLocalDocs` จัดอันดับคำที่ตรงกันจาก snippet คงที่ 4 แหล่งและคืน `sourceId`, title, excerpt การทำงานนี้ deterministic และอ่าน/แก้ได้ง่าย เหมาะกับเอกสารชุดเล็ก เมื่อข้อมูลโตขึ้นคุณค่อยออกแบบ retrieval ที่เหมาะสมเอง แต่อย่าบอกผู้ใช้ว่า starter นี้มี vector RAG

`useChat` ใช้ `DefaultChatTransport` และแนบ `byok` ตอนส่ง request เท่านั้น ฝั่ง server ตรวจ body และ UI message ก่อนสร้าง OpenAI provider แล้วจึงสตรีมผลของ agent

## ข้อจำกัดและความปลอดภัย

- key อยู่ใน React/page memory และ request memory เท่านั้น ปุ่ม **Forget** จะหยุดงานและล้าง key จาก state/ref; ไม่มีการ persist หรือ log key
- starter ไม่ใช้ model/key ของ ai-sdk.pro และไม่รับ custom base URL; ค่า provider/model ถูกกำหนดตายตัวเป็น OpenAI + `gpt-5-mini`
- request จำกัด body ประมาณ 120 KB, ข้อความไม่เกิน 40 รายการ และ agent ไม่เกิน 8 steps, 900 output tokens หรือ 55 วินาที
- error จาก upstream ถูกแทนด้วยข้อความทั่วไป ไม่ส่งต่อ response ดิบ; การใช้งานจริงคิดค่าใช้จ่ายกับบัญชี OpenAI ของเจ้าของ key และควรใช้ HTTPS
- ไม่มีฐานข้อมูล, login, rate-limit แบบหลายเครื่อง หรือระบบ deploy ใน starter นี้

## ส่งต่อ DevStack ด้วยมือ

Deploy link จาก ai-sdk.pro เป็นเพียงทางไปหน้า template ของ DevStack ไม่ได้อัปโหลด source, ส่ง API key, สร้าง repository หรือ deploy อัตโนมัติ ให้ build/test ในเครื่องก่อน แล้วเปิด DevStack, login ตามที่ระบบขอ, เลือก template ที่ตรงกัน, review source และตั้ง environment ของคุณเองตามขั้นตอนของ DevStack การสร้าง GitHub และ deployment ยังเป็นงานที่ผู้ใช้ทำเอง ไม่มีการแก้ไข DevStack จาก starter นี้

สำหรับคำถามเกี่ยวกับ ai-sdk.pro ติดต่อ `sdkbank@1origin.dev` ได้ โดยอย่าใส่ API key ในอีเมลหรือ issue สาธารณะ
