# @aisdkpro/client

`@aisdkpro/client` คือ client SDK แบบ framework-agnostic สำหรับ endpoint ที่คืน **AI SDK 6 UI Message Stream** ของ ai-sdk.pro แพ็กเกจ core ไม่มี runtime dependency และใช้ `fetch`, `ReadableStream`, `TextDecoder` และ `AbortController` ของ runtime นั้น ๆ

> ai-sdk.pro เป็นโครงการอิสระ ไม่ใช่เว็บไซต์ทางการของ Vercel แชท public ใช้คีย์ที่ผู้ใช้กรอกเองแบบ BYOK ไม่ส่งคีย์ของเจ้าของเว็บให้ browser

## Scope boundary

แพ็กเกจรุ่น `0.1.0` นี้เป็น chat client สำหรับ AI SDK 6 UI Message Stream เท่านั้น ข้อเสนอเกี่ยวกับ control/build/runtime planes, GitHub App, Coolify adapter, BYOVPS, project/deployment/agent-run APIs และ CLI ยังเป็นงานสถาปัตยกรรมในอนาคต ไม่ใช่ API ที่แพ็กเกจนี้เปิดใช้งานแล้ว จึงไม่มี deployment API จำลองใน SDK

## ติดตั้ง

แพ็กเกจนี้ผ่าน build, tests และ npm dry-run แล้ว แต่ยังไม่ได้ publish จริงบน npm หรือ jsDelivr ให้ใช้จาก workspace และรัน `pnpm --filter @aisdkpro/client build` ในระหว่างนี้ คำสั่งติดตั้งและ CDN ด้านล่างใช้ได้หลังผู้ดูแลตั้ง namespace และ publish เวอร์ชันนั้นแล้วเท่านั้น

```bash
npm install @aisdkpro/client ai
```

ถ้าต้องการ React binding เพิ่ม peer dependencies ของ React และ AI SDK React:

```bash
npm install @aisdkpro/client ai @ai-sdk/react react react-dom
```

## Framework-agnostic `ChatClient`

`ChatClient` รับ `UIMessage[]` และแปลง SSE แต่ละ record เป็น event ที่มีชนิดชัดเจน โดยไม่ผูกกับ React หรือ UI framework ใด ๆ

```ts
import type { UIMessage } from 'ai';
import { ChatClient } from '@aisdkpro/client';

const client = new ChatClient({
  // Use an absolute origin for a separately hosted API.
  baseUrl: 'https://chat.example.com',
  endpoint: '/api/chat',
});

const messages: UIMessage[] = [
  {
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', text: 'สวัสดี' }],
  },
];

const controller = new AbortController();

for await (const event of client.stream(messages, { signal: controller.signal })) {
  if (event.type === 'text-delta') process.stdout.write(event.delta);
  if (event.type === 'error') console.error(event.errorText);
}

// A Stop button can call either method.
client.stop();
// client.abort();
```

ทุก `ChatEvent` มี `event.chunk` เป็น `UIMessageStreamChunk` เดิมจาก SSE โดยยังเก็บฟิลด์ของโปรโตคอลที่ convenience mapping ไม่ได้ยกขึ้นมา เช่น `usage`, `mediaType`, `input` และ approval metadata ไว้ให้ใช้งานได้โดยตรง ส่วนฟิลด์ที่มีชื่อบน event เช่น `event.delta` หรือ `event.toolCallId` ยังคงใช้ได้เหมือนเดิม

`ChatClient` จะส่ง JSON รูปแบบ `{ messages }` ด้วย `Accept: text/event-stream` และรองรับ `headers`, `credentials`, `body` และ `fetch` แบบกำหนดเองใน `ChatClientOptions`/`ChatStreamOptions` สำหรับ auth ของ endpoint ภายนอก

```ts
const client = new ChatClient({
  baseUrl: import.meta.env.VITE_AI_API_BASE_URL,
  headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
});
```

ห้าม hardcode `AI_API_KEY`, `ANTHROPIC_API_KEY` หรือคีย์ของเจ้าของเว็บในโค้ด browser ตัวอย่างข้างต้น

### BYOK สำหรับ public endpoint

ให้รับคีย์จากช่อง password ของผู้ใช้และเก็บใน page memory เท่านั้น ส่งแยกจากข้อความด้วย `ChatStreamOptions.body` ที่ SDK รองรับอยู่แล้ว:

```ts
// apiKeyFromUserInput is user-entered at runtime, never a hardcoded owner key.
for await (const event of client.stream(messages, {
  body: {
    byok: {
      provider: 'openai',
      model: 'gpt-5-mini',
      apiKey: apiKeyFromUserInput,
    },
  },
})) {
  if (event.type === 'text-delta') renderDelta(event.delta);
}
```

Production public endpoint ต้องมี BYOK ทุก request ไม่ fallback ไปคีย์ owner คีย์ส่งผ่าน HTTPS ให้ server และ fixed official provider สำหรับ request นั้นเท่านั้น ไม่เก็บใน URL, messages, storage หรือ logs ผู้ใช้จ่ายค่า API ให้ provider ของตนเอง ความพร้อมใช้งานของโมเดลขึ้นอยู่กับบัญชี provider

## React binding

React binding แยกเป็น subpath เพื่อไม่เพิ่ม React ให้การใช้งาน core โดยไม่จำเป็น และสร้าง AI SDK 6 `DefaultChatTransport` ให้โดยอัตโนมัติ

```tsx
'use client';

import { useAISDKProChat } from '@aisdkpro/client/react';

export function Chat() {
  const chat = useAISDKProChat({
    baseUrl: 'https://chat.example.com',
    endpoint: '/api/chat',
  });

  return (
    <button type="button" onClick={() => chat.stop()}>
      Stop
    </button>
  );
}
```

สามารถส่ง `transportOptions` ที่ AI SDK 6 รองรับได้ เช่น `headers` หรือ `body` โดย hook จะสงวน `api` ให้ตรงกับ `baseUrl`/`endpoint`

## Browser compatibility

รองรับ browser สมัยใหม่ที่มี `fetch`, `ReadableStream`, `TextDecoder` และ `AbortController` เช่น Chrome/Edge/Firefox/Safari รุ่นที่ยังได้รับการดูแลในปัจจุบัน สำหรับ Node.js ให้ใช้ Node 18+ และแนะนำ Node 22 ใน production หากต้องรองรับ browser เก่าที่ไม่มี Web Streams ให้เพิ่ม polyfill ที่ application เลือกเอง แพ็กเกจนี้ไม่มี polyfill ติดมาให้

## ใช้ผ่าน jsDelivr

ใช้ ESM build ผ่าน script tag ได้โดยไม่ต้องใช้ bundler:

```html
<script type="module">
  import { ChatClient } from 'https://cdn.jsdelivr.net/npm/@aisdkpro/client@0.1.0/+esm';

  const client = new ChatClient({ baseUrl: 'https://chat.example.com' });
  const messages = [{
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', text: 'สวัสดี' }],
  }];
  for await (const event of client.stream(messages)) {
    if (event.type === 'text-delta') document.body.append(event.delta);
  }
</script>
```

ต้องกำหนด CORS/origin allowlist ของ server ให้กับเว็บที่เรียกใช้งาน และไม่ควรเปิด provider endpoint โดยตรงให้ browser

## ตรวจสอบและ publish

```bash
pnpm --filter @aisdkpro/client typecheck
pnpm --filter @aisdkpro/client test
pnpm --filter @aisdkpro/client build
pnpm --filter @aisdkpro/client publish:dry-run
```

การ publish จริงใช้ GitHub Actions Trusted Publishing แบบ OIDC ใน `infra/workflows/npm-publish.yml` หลังจากผู้ดูแลลงทะเบียน repository/workflow บน npmjs.com แล้วเท่านั้น
