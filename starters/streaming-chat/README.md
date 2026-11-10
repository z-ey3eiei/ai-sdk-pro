# Streaming Chat starter

ตัวอย่าง Next.js App Router + TypeScript strict ที่สตรีม UI message ด้วย AI SDK 6 จริง ใช้ `ToolLoopAgent` และ `createAgentUIStreamResponse` กับ OpenAI provider ทางการเท่านั้น รุ่นถูกล็อกไว้ที่ `gpt-5-mini` และมี tool `getCurrentTime` ที่รับเฉพาะ `UTC`, `Asia/Bangkok`, `America/New_York`

## เริ่มใช้งาน

ต้องมี Node.js 22 และ npm:

```bash
unzip streaming-chat-*.zip
cd streaming-chat
npm install
npm run dev
```

เปิด `http://localhost:3000` แล้วใส่ OpenAI API key ในช่อง masked input กด **Connect in memory** ก่อนส่งข้อความ การ connect เป็นการตรวจรูปแบบในหน้าเว็บเท่านั้น ไม่ได้ยิงไป OpenAI จนกว่าจะส่งข้อความจริง

สำหรับ build/serve production:

```bash
npm run build
npm run start
```

ถ้าโฮสต์ที่ origin อื่น ให้คัดลอก `.env.example` เป็น `.env.local` และตั้ง `APP_ORIGIN` เป็น origin แบบตรงตัว เช่น `https://chat.example.com` ห้ามใส่ secret ในไฟล์นี้

## บทเรียนสั้น ๆ

`useChat` ใช้ `DefaultChatTransport` และแนบ `byok` ใน request body ตอนส่งเท่านั้น ไม่ใส่ key ใน message parts, URL, cookie หรือ storage ฝั่ง browser ฝั่ง server ตรวจ body และ UI message ก่อนสร้าง provider จากนั้นจึงรัน agent และสตรีมกลับมา ส่วน tool มี `inputSchema` จาก Zod เพื่อให้ข้อมูลเข้า tool ถูกจำกัดชัดเจน

## ข้อจำกัดและความปลอดภัย

- key อยู่ใน React/page memory และ request memory เท่านั้น ปุ่ม **Forget** จะหยุดงานและล้าง key จาก state/ref; ไม่มีการ persist หรือ log key
- starter ไม่ใช้ model/key ของ ai-sdk.pro และไม่รับ custom base URL; ค่า provider/model ถูกกำหนดตายตัวเป็น OpenAI + `gpt-5-mini`
- request จำกัด body ประมาณ 120 KB, ข้อความไม่เกิน 40 รายการ และ agent ไม่เกิน 8 steps, 900 output tokens หรือ 55 วินาที
- error จาก upstream ถูกแทนด้วยข้อความทั่วไป ไม่ส่งต่อ response ดิบ; การใช้งานจริงยังคิดค่าใช้จ่ายกับบัญชี OpenAI ของเจ้าของ key และควรใช้ HTTPS
- ไม่มีฐานข้อมูล, login, rate-limit แบบหลายเครื่อง หรือระบบ deploy ใน starter นี้

## ส่งต่อ DevStack ด้วยมือ

Deploy link จาก ai-sdk.pro เป็นเพียงทางไปหน้า template ของ DevStack ไม่ได้อัปโหลด source, ส่ง API key, สร้าง repository หรือ deploy อัตโนมัติ ให้ build/test ในเครื่องก่อน แล้วเปิด DevStack, login ตามที่ระบบขอ, เลือก template ที่ตรงกัน, review source และตั้ง environment ของคุณเองตามขั้นตอนของ DevStack การสร้าง GitHub และ deployment ยังเป็นงานที่ผู้ใช้ทำเอง ไม่มีการแก้ไข DevStack จาก starter นี้

สำหรับคำถามเกี่ยวกับ ai-sdk.pro ติดต่อ `sdkbank@1origin.dev` ได้ โดยอย่าใส่ API key ในอีเมลหรือ issue สาธารณะ
