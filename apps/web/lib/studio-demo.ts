export type DemoLabel = "ข้อมูลตัวอย่าง · ไม่ได้เชื่อมต่อ";
export type DemoProject = {
  id: string;
  name: string;
  description: string;
  framework: string;
  branch: string;
  updated: string;
  stage: string;
  demo: true;
};
export type DemoTarget = {
  name: string;
  kind: string;
  state: string;
  description: string;
  demo: true;
};
export type DemoDeployment = {
  id: string;
  project: string;
  target: string;
  status: string;
  branch: string;
  time: string;
  url: string;
  demo: true;
};
export const DEMO_LABEL: DemoLabel = "ข้อมูลตัวอย่าง · ไม่ได้เชื่อมต่อ";
export const demoProjects: DemoProject[] = [
  {
    id: "prj-northstar",
    name: "Northstar storefront",
    description: "หน้าร้านตัวอย่างสำหรับทีม commerce",
    framework: "Next.js",
    branch: "main",
    updated: "ตัวอย่าง · 2 ชม.ก่อน",
    stage: "เตรียม source",
    demo: true,
  },
  {
    id: "prj-docs",
    name: "Product docs",
    description: "เอกสารผลิตภัณฑ์และคู่มือทีม",
    framework: "Astro",
    branch: "release",
    updated: "ตัวอย่าง · เมื่อวาน",
    stage: "รอตั้งค่า target",
    demo: true,
  },
  {
    id: "prj-lab",
    name: "Edge preview lab",
    description: "ทดลองออกแบบแอป edge แบบแยกส่วน",
    framework: "Vite",
    branch: "experiment/edge",
    updated: "ตัวอย่าง · 3 วันก่อน",
    stage: "ยังไม่เชื่อมต่อ",
    demo: true,
  },
];
export const demoTargets: DemoTarget[] = [
  {
    name: "Vercel",
    kind: "Deploy adapter",
    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
    description:
      "เชื่อม build artifact ไปยัง project/환경ปลายทาง หลังเพิ่ม server-side adapter",
    demo: true,
  },
  {
    name: "Cloudflare Workers",
    kind: "Deploy adapter",
    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
    description:
      "เตรียมแพ็กเกจและ runtime สำหรับ Worker ใน isolated build environment",
    demo: true,
  },
  {
    name: "SSH-compatible VPS",
    kind: "Remote target",
    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
    description:
      "ส่ง artifact ผ่านช่องทางที่ควบคุมได้ โดย credentials อยู่ใน server-side secret store",
    demo: true,
  },
];
export const demoDeployments: DemoDeployment[] = [
  {
    id: "demo-run-104",
    project: "Northstar storefront",
    target: "Vercel · ตัวอย่าง target",
    status: "ตัวอย่าง · ยังไม่มี deployment",
    branch: "main",
    time: "ตัวอย่าง · 13 พ.ย. 2026 · 10:40",
    url: "example.invalid · URL ตัวอย่าง",
    demo: true,
  },
  {
    id: "demo-run-103",
    project: "Product docs",
    target: "Cloudflare Workers · ตัวอย่าง target",
    status: "ตัวอย่าง · ยังไม่มี deployment",
    branch: "release",
    time: "ตัวอย่าง · 12 พ.ย. 2026 · 16:20",
    url: "example.invalid · URL ตัวอย่าง",
    demo: true,
  },
];
export const demoLog = [
  "[ตัวอย่าง] Workbench ยังไม่ได้เชื่อม build runner",
  "[ตัวอย่าง] ขั้นที่ 1 · รับ source repository — รอการเชื่อมต่อ",
  "[ตัวอย่าง] ขั้นที่ 2 · isolated build environment — ยังไม่เริ่ม",
  "[ตัวอย่าง] ขั้นที่ 3 · deploy adapter / target — ยังไม่เริ่ม",
  "[ตัวอย่าง] ไม่มี log จริง, artifact หรือผล deploy ใน prototype นี้",
];
export const architectureStages = [
  {
    title: "01 · Source repository",
    text: "เลือก repository, branch และ commit ที่ต้องการสร้าง — การเชื่อมต่อยังเป็นแผน",
  },
  {
    title: "02 · Isolated build",
    text: "build โค้ดใน environment แยกจาก control plane และ secrets",
  },
  {
    title: "03 · Deploy adapter / target",
    text: "เตรียม adapter สำหรับ Vercel, Cloudflare Workers หรือ SSH-compatible VPS",
  },
  {
    title: "04 · Logs, artifacts, rollback",
    text: "ในอนาคตจึงค่อยแสดงผล build, logs, artifact และ rollback ที่ยืนยันจากระบบจริง",
  },
];
