export const starterGuide = `# ใช้ Starter และส่งต่อไป DevStack

ai-sdk.pro เป็นที่เลือกตัวอย่าง เรียนรู้ และใช้เครื่องมือจริง ส่วน DevStack เป็นปลายทางที่คุณเลือกสำหรับโฮสต์ เราไม่สร้างระบบ Deploy ซ้ำและไม่ส่ง source หรือ API key อัตโนมัติเมื่อกดปุ่ม

## เลือกสิ่งที่จะสร้าง

เปิด [Templates](/templates) แล้วเลือก **Streaming Chat** สำหรับ AI chat ที่สตรีมจริง, **Docs Assistant** สำหรับ agent ที่ค้น snippets ในโปรเจกต์ หรือ **Agent Launchpad** สำหรับเว็บไซต์ static ที่แนะนำเครื่องมือของคุณ แต่ละหน้าแสดง source download, requirements, code preview และคำสั่งเริ่มต้น ไม่ใช่แค่ภาพตัวอย่าง

Streaming Chat และ Docs Assistant ใช้ Next.js กับ AI SDK 6 และ OpenAI BYOK ผู้ใช้กรอกคีย์ในช่องปกปิด คีย์อยู่เฉพาะ page/request memory ไม่เก็บใน storage, cookie, log หรือ message parts ใช้เฉพาะ endpoint ของ OpenAI และโมเดล gpt-5-mini ค่า API คิดจากบัญชีเจ้าของคีย์ ต้องมีสิทธิ์ใช้โมเดลนั้นจึงจะสร้างคำตอบจริงได้ Agent Launchpad ไม่ต้องใช้คีย์ AI

## ดาวน์โหลดและรันในเครื่อง

ดาวน์โหลด ZIP จากหน้าของ starter แล้วแตกไฟล์ เข้าโฟลเดอร์ที่ชื่อเดียวกับ starter ใช้ Node.js 22 และ npm:

\`\`\`bash filename=terminal
cd streaming-chat
npm install
npm run dev
\`\`\`

เปิด http://localhost:3000 สำหรับ Docs Assistant เปลี่ยนชื่อโฟลเดอร์เป็น docs-assistant; Launchpad ใช้ agent-launchpad อ่าน README ใน ZIP เพื่อดูค่า port/คำสั่งและข้อจำกัดของตัวอย่างนั้น ไม่จำเป็นต้องติดตั้งแพ็กเกจ @aisdkpro/client ที่ยังไม่ได้เผยแพร่บน npm

ก่อนโฮสต์ chat starter ให้ตั้ง APP_ORIGIN เป็น origin HTTPS จริงของเว็บไซต์ใน environment ฝั่ง server ไม่ใช่เก็บ API key ในตัวแปร NEXT_PUBLIC_ เมื่อเปลี่ยน environment ให้ restart runtime ตามระบบโฮสต์ที่ใช้

## ทดลองเครื่องมือบน ai-sdk.pro

[Playground](/chat) ใช้ API key ของคุณกับ Anthropic, OpenAI หรือ Google และมี tools ที่ใช้ได้จริง ปุ่ม “ลองถาม agent” ในหน้า starter เติมคำถามให้เท่านั้น คุณยังต้องเลือก provider/คีย์และกดส่งเอง ไม่มี model request จากการกดดูตัวอย่าง

[Workspace](/workspace) ใช้ GitHub login เพื่อดู repository ที่อนุญาตและนำเข้า text snapshot แบบอ่านอย่างเดียว แต่ยังไม่ใช่การ build หรือ deploy repo ภายใน ai-sdk.pro ไฟล์ snapshot จำกัด 100 ไฟล์, 64 KiB ต่อไฟล์, 2 MiB รวม และข้ามไฟล์ binary/dependencies/secret paths

## แก้ตัวอย่างให้เป็นของคุณ

Streaming Chat มี tool ดูเวลาใน timezone ที่อนุญาต Docs Assistant ค้นข้อความใน lib/knowledge.ts และคืน source ids: แก้ snippets เป็นข้อมูลสาธารณะที่คุณต้องการให้ agent อ้างอิง นี่คือ local knowledge search ไม่ใช่ vector database/RAG เต็มระบบ ห้ามใส่ข้อมูลลับลงใน snippets ที่จะส่งให้ model

Agent Launchpad แก้ public/index.html และลิงก์เครื่องมือ แล้วใช้ npm run build เพื่อสร้าง dist ชุด source มีคำสั่งและไฟล์ที่ตรวจสอบได้ ไม่พึ่งแชทจำลองหรือผล deploy ที่แต่งขึ้น

## เปิดไป DevStack สำหรับ Deploy

ปุ่ม **Deploy on DevStack** จะเปิด recipe ที่รองรับ framework ใกล้เคียงกัน: [Next.js AI Chat](https://devstack.bid/templates/nextjs-ai-chat) หรือ [Static Website](https://devstack.bid/templates/static-website) ในแท็บใหม่ Starter ของ ai-sdk.pro ไม่ใช่ source ชุดเดียวกับ recipe ของ DevStack คุณต้องเลือกว่าจะใช้ source ที่ดาวน์โหลดหรือ scaffold ตาม recipe นั้น

การกดปุ่มยังไม่ได้สร้าง repo, upload code, ส่งคีย์, จ่ายค่าบริการ หรือยืนยัน deployment คุณต้องล็อกอิน/อนุญาตสิทธิ์ เลือก source/repository และตรวจ runtime/build/output settings ภายใน DevStack ก่อน URL ผลลัพธ์และความสำเร็จต้องมาจาก build/deploy จริงของ DevStack

สำหรับ source ของ starter นี้: รัน npm run build ให้ผ่านในเครื่องก่อน แล้วเก็บใน repository ที่คุณมีสิทธิ์ ไม่มี .env จริงหรือ node_modules เมื่อใช้ CLI ของ DevStack ดู [แพ็กเกจ devstack-bid](https://www.npmjs.com/package/devstack-bid) เพื่อใช้ขั้นตอนล่าสุด ไม่ต้องสร้าง CLI อีกชุดใน ai-sdk.pro

\`\`\`bash filename=terminal
# Run manually only when you intend to sign in to DevStack.
npx devstack-bid login
# Review the available templates and current CLI instructions.
npx devstack-bid templates
\`\`\`

CLI มี login แบบ device code และสิทธิ์ deploy เป็น opt-in การ link repository อาจเริ่ม build แรกและมีค่า usage ตามบริการที่ใช้ อย่าใส่ token ในคำสั่ง, source, URL หรือส่งคีย์ AI/GitHub ผ่านลิงก์ Deploy ตอนนี้ CLI build จาก GitHub ไม่ใช่ upload โฟลเดอร์ในเครื่องโดยตรง

## ขอบเขตของรุ่นนี้

ติดต่อ ai-sdk.pro: [sdkbank@1origin.dev](mailto:sdkbank@1origin.dev)

รุ่นนี้มี source downloads, คู่มือ, playground และ workspace ที่ใช้ได้จริง ปุ่ม DevStack เป็น handoff ที่ผู้ใช้ควบคุม ไม่ใช่ status ว่าเว็บโฮสต์แล้ว Worker ใหม่, public build queue, ระบบ API keys/CLI ใหม่ของ ai-sdk.pro และ npm publication ยังพักไว้ เพื่อไม่ทำซ้ำกับ DevStack หรือเปลี่ยนบริการ production โดยไม่จำเป็น
`;
