# Agent Launchpad starter

เว็บไซต์ static HTML/CSS/JS แบบ self-contained สำหรับอธิบาย agent ที่คุณสร้างเอง มีลิงก์แก้ไขได้ไปยังหน้าใช้งานจริงของ ai-sdk.pro (`/chat`, `/templates`, `/workspace`), ตัวอย่างโค้ดที่ copy ได้ และปุ่มไปหน้า template ของ DevStack สำหรับการ handoff ด้วยมือ ไม่มี AI key, ไม่มี runtime dependency และไม่มี backend ใน starter นี้

## เริ่มใช้งาน

ต้องมี Node.js 22 และ npm:

```bash
unzip agent-launchpad-*.zip
cd agent-launchpad
npm install
npm run dev
```

`npm install` ไม่มี package ภายนอกให้ติดตั้ง แต่ใช้คำสั่งเดียวกันกับ starter อื่นได้ เปิด `http://localhost:3000` แล้วแก้ชื่อ ข้อความ และลิงก์ใน `public/index.html` ได้เลย

สร้างไฟล์ static สำหรับโฮสต์:

```bash
npm run build
```

โฟลเดอร์ `dist/` คือ output ที่นำไปโฮสต์เป็น static site ได้ ไฟล์ build เป็นเพียงการคัดลอก `public/` แบบ deterministic ไม่มีการ compile หรือ upload ภายนอก

## บทเรียนสั้น ๆ

`public/app.js` ทำงานเฉพาะ copy code และเมนูเล็ก ๆ ใน browser ส่วน `scripts/dev.mjs` เป็น static server ของ Node ที่อ่านจาก `public/` เท่านั้น ไม่รับ upload ไม่ execute source และป้องกัน path traversal เบื้องต้น ตัวอย่างโค้ดบนหน้าเว็บติดป้ายว่า **example** เพื่อไม่ให้สับสนกับ deployment จริง

## ข้อจำกัดและความปลอดภัย

- ไม่มี API key, model call, database, login, analytics หรือ runtime service ที่เสียเงิน
- ลิงก์และข้อความเป็น template ที่แก้ไขได้ ตรวจสอบปลายทางก่อนเผยแพร่ และอย่าวาง secret ใน HTML/JS
- ไม่มีการอ้าง hosted URL, build metric, usage metric หรือ deployment success ที่ไม่ได้ตรวจสอบ
- contact สำหรับคำถามเกี่ยวกับ ai-sdk.pro: `sdkbank@1origin.dev`

## ส่งต่อ DevStack ด้วยมือ

ปุ่ม **Open DevStack template** เปิด `https://devstack.bid/templates/static-website` เพื่อให้คุณ login (ถ้าระบบขอ), เลือก source, review และตั้งค่าการโฮสต์เอง ปุ่มนี้ไม่อัปโหลด source ไม่ส่ง key ไม่สร้าง GitHub และไม่ deploy อัตโนมัติ ถ้าต้องการใช้ recipe อื่นให้แก้ URL ใน `public/index.html` เป็นลิงก์ที่คุณตรวจสอบแล้ว
