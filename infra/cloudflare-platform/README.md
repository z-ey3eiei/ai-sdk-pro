# ai-sdk.pro · Cloudflare deployment platform

โมดูลนี้เป็น staging แบบแยกจากระบบ ai-sdk.pro เดิม API กับ Dashboard ใช้ `deploy-staging.ai-sdk.pro` ส่วนเว็บลูกค้าตั้งค่า `PROJECT_DOMAIN` ใน Wrangler ทั้งสองไฟล์ ใช้ `ai-sdk.pro` สำหรับทั้ง Dashboard และ subdomain ของโปรเจกต์ หน้าเว็บหลักเชื่อมผ่านเมนู Deploy ไปที่ `/deploy`

| ส่วน | งาน |
| --- | --- |
| API Worker | GitHub App OAuth, dashboard, project settings, env vars, signed webhook และ Queue |
| Workflow | อ่าน commit ผ่าน installation token, ตรวจ source, build, เก็บ log และ artifact ใน R2, เผยแพร่ User Worker |
| Dispatch Worker | ใช้ hostname จาก URL, อ่าน KV และตรวจ active deployment ใน D1 ก่อนส่งไป User Worker |
| D1 | ผู้ใช้, sessions, โปรเจกต์, คิวพร้อมประวัติ, custom domains และค่า env ที่เข้ารหัส |
| Cloudflare for SaaS | สร้าง custom hostname, แสดง DNS verification และเปิด route หลัง hostname กับ SSL เป็น active |

Worker ของลูกค้าหนึ่งตัวต่อ deployment ใช้ immutable script name เพื่อให้ build ที่เสร็จช้ากว่าเปลี่ยนเว็บกลับไป commit ก่อนหน้าไม่ได้ หาก KV ยังไม่อัปเดต จะเลือก Worker จาก active deployment ใน D1 เท่านั้น ชื่อ subdomain ที่ไม่มีโปรเจกต์ที่เผยแพร่แล้วจะได้ 404

## ขอบเขต staging

- Static HTML เผยแพร่ได้จาก root ที่มี `index.html` หรือ `public/` หากมี `public/index.html` สามารถตั้ง output folder เองได้ เผยแพร่เฉพาะนามสกุล asset ที่รองรับ ควรชี้ไปยังไดเรกทอรีสำหรับเผยแพร่โดยเฉพาะ เพราะไฟล์ที่อนุญาตในโฟลเดอร์นี้จะเป็นสาธารณะ
- Astro static และ Next.js static export ใช้ `npm ci --ignore-scripts` และ `npm run build` ใน Cloudflare Sandbox แยกต่อ deployment ต้องมี `package-lock.json` และค่า Next.js `output: "export"` สำหรับ Next.js เปิดด้วย `FRAMEWORK_BUILDS=enabled` หลังทดสอบ Container และ egress policy จริง
- Build container มีเวลาและขนาดจำกัด ออกได้เฉพาะ `registry.npmjs.org` และได้รับไฟล์ source กับค่าควบคุม build ที่กำหนดในโค้ด GitHub token, Cloudflare token และค่าตัวแปรของโปรเจกต์อยู่ใน Worker ฝั่งแพลตฟอร์ม
- Environment variables ถูกเข้ารหัสใน D1 และแนบเป็น secret bindings ตอน publish ตัวเสิร์ฟ static ไม่มีโค้ดลูกค้าที่อ่านค่าเหล่านี้ SSR, API routes, arbitrary User Worker code และ build-time secrets ยังไม่รองรับ
- Free มี 3 โปรเจกต์, 10 deploy ต่อ 24 ชั่วโมง และ 1 งานที่ค้างหรือกำลังทำ Pro มี 25 โปรเจกต์, 100 deploy และ 5 งานตามลำดับ เปลี่ยน plan ผ่าน operator ใน D1 ได้ ระบบชำระเงินยังไม่รวม เมื่อ webhook ชน quota จะตอบจำนวนงานที่จำกัดและไม่เริ่ม build เพิ่ม
- Dashboard เป็น invite-only ด้วย GitHub numeric IDs ตั้งค่า lifecycle ของ R2 แยกที่ `logs/` และ `artifacts/` รวมทั้งกำหนดขั้นตอน cleanup ของ User Worker รุ่นเก่า สัญญาณการละเมิด และ WAF rate limit ก่อนเปิดรับสาธารณะ การลบโปรเจกต์หยุด routing และลบค่าตัวแปรทันที ส่วน deployment log, artifacts และ Worker รุ่นเก่ายังเก็บไว้ให้ operator จัดการตาม retention policy

## สถานะ assembly

ทรัพยากร staging บัญชี `2d92bd5b25768fa9093d6adc0a8887fc` ผูกใน `wrangler.jsonc` / `wrangler.dispatch.jsonc` แล้ว — รายละเอียดและขั้นตอนตรวจดูได้ที่ [`ASSEMBLY-STATE.md`](./ASSEMBLY-STATE.md) และ `./scripts/verify-assembly.sh` (ต้องมี `CLOUDFLARE_API_TOKEN`)

Dashboard สด: **https://deploy-staging.ai-sdk.pro** (ล็อกอิน GitHub invite-only สำหรับ `BETA_GITHUB_IDS`)

## ตั้งค่า Cloudflare staging

ใช้ Node 24 และบัญชี Cloudflare ที่เปิด Workers for Platforms กับ Containers แล้ว จากโฟลเดอร์นี้รัน

```bash
npm ci
npm test
npm run check
npm run dry-run
```

1. เข้า **Workers & Pages → Workers for Platforms** แล้วสร้าง dispatch namespace `aisdkpro-platform-staging` หรือใช้ namespace staging ที่ตรวจแล้วว่าเป็นของโมดูลนี้ ตั้งชื่อให้ตรงกับ `DISPATCH_NAMESPACE` และ `dispatch_namespaces`
2. สร้าง D1, KV, R2, deploy Queue และ dead-letter Queue หรือยืนยันของที่เตรียมไว้แล้ว อย่ารันคำสั่งสร้างซ้ำถ้าพบชื่อเดิมในบัญชี นำ ID ของ D1 และ KV ไปใส่ใน config ทั้งสองไฟล์ และตั้ง `CLOUDFLARE_ACCOUNT_ID`

   ```bash
   npx wrangler d1 create aisdkpro-platform-staging
   npx wrangler kv namespace create aisdkpro-platform-staging-routes
   npx wrangler r2 bucket create aisdkpro-platform-staging-builds
   npx wrangler queues create aisdkpro-platform-staging-dead
   npx wrangler queues create aisdkpro-platform-staging-deploy
   npx wrangler d1 migrations apply DB --config wrangler.jsonc --remote
   ```

3. ลงทะเบียน GitHub App สำหรับ staging ตั้ง Callback URL เป็น `https://deploy-staging.ai-sdk.pro/auth/github/callback` และ Webhook URL เป็น `https://deploy-staging.ai-sdk.pro/api/github/webhook` เปิด repository permissions `Contents: Read-only` กับ `Metadata: Read-only` แล้ว subscribe `Push` ติดตั้งกับรีโปทดสอบที่ต้องการ ให้ `GITHUB_CLIENT_ID`, `GITHUB_APP_ID` (ตัวเลขจาก App settings) และ `GITHUB_APP_SLUG` ตรงกับ App นี้ โค้ดรองรับ GitHub App authorization ด้วย PKCE ค่า private key ต้องเป็น PKCS#8

   ```bash
   openssl pkcs8 -topk8 -nocrypt -in github-app.private-key.pem -out github-app.pkcs8.pem
   npx wrangler secret put GITHUB_APP_PRIVATE_KEY --config wrangler.jsonc < github-app.pkcs8.pem
   npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.jsonc
   npx wrangler secret put GITHUB_WEBHOOK_SECRET --config wrangler.jsonc
   openssl rand -base64 32 | npx wrangler secret put ENCRYPTION_KEY --config wrangler.jsonc
   npx wrangler secret put CLOUDFLARE_DEPLOY_TOKEN --config wrangler.jsonc
   ```

   สร้าง deploy token เฉพาะบัญชี staging ให้มีสิทธิ์เขียน Workers Scripts ที่ endpoint dispatch และ assets ต้องใช้ แยก token ของ Cloudflare for SaaS และตั้ง Zone Custom Hostnames ในโซนที่เลือก ห้ามสร้าง key เข้ารหัสใหม่ตอน redeploy หากต้องใช้ session และ env เดิม

4. ตั้ง `BETA_GITHUB_IDS` เป็นตัวเลข GitHub ID ที่อนุญาตคั่นด้วย comma ตรวจ `API_ORIGIN` กับ custom domain ของ API และ deploy สอง Worker

   ```bash
   npx wrangler deploy --config wrangler.jsonc
   npx wrangler deploy --config wrangler.dispatch.jsonc
   ```

5. ในโซน `ai-sdk.pro` ทดสอบด้วย DNS แบบ proxied และ Workers Route ของ hostname โครงการทดสอบเพียงชื่อเดียวก่อนตรวจ TLS แล้วจึงค่อยพิจารณา `*.ai-sdk.pro/*` ตรวจรายการ DNS และ Worker routes ของ www, docs, mcp, preview, staging และ subdomain อื่นทั้งหมด ให้มี route ที่เจาะจงกว่าหรือ no-script exclusion ตามปลายทางเดิมก่อนเปิด wildcard
6. สำหรับ Custom Domains เปิด **SSL/TLS → Custom Hostnames** ตั้ง fallback origin ด้วยระเบียน proxied; ก่อนใช้ route `*/*` ในโซนร่วมกับเว็บหลัก ให้คงเส้นทาง apex และ subdomain เดิมด้วย route ที่เจาะจงกว่า หรือกำหนด Worker route เฉพาะ custom hostname ที่ทดสอบแล้ว ตั้ง `SAAS_ZONE_ID`, `SAAS_CNAME_TARGET` และ `SAAS_API_TOKEN` แล้ว deploy API ใหม่ ใน Dashboard เพิ่ม hostname ทำ CNAME และ ownership/certificate verification ตามค่าที่แสดง จากนั้นกด **ตรวจ DNS** จนทั้งสองสถานะเป็น active
7. ทดสอบด้วยรีโป HTML ก่อน ล็อกอิน → ติดตั้ง GitHub App → import → Deploy → เปิด hostname และเทียบ `/_aisdk-commit.json` กับ SHA ใน Dashboard จากนั้น push commit ใหม่บน branch ที่ตั้งไว้และเทียบอีกครั้ง ตรวจว่า log เปิดได้เฉพาะเจ้าของ และทดสอบ DNS/TLS ด้วย custom hostname ที่เป็นของทีม

## เอกสารอ้างอิง

- [Workers for Platforms dynamic dispatch](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/dynamic-dispatch/)
- [User Worker static assets upload](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/static-assets/)
- [Cloudflare Sandbox security](https://developers.cloudflare.com/sandbox/concepts/security/)
- [Cloudflare for SaaS Worker fallback origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/)
