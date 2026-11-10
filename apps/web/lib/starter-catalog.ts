import { starterArchives } from "./starter-archives.generated";

export type StarterSlug =
  | "streaming-chat"
  | "docs-assistant"
  | "agent-launchpad";
export type StarterCategory = "Chat" | "Agents" | "Web";
export interface StarterTemplate {
  slug: StarterSlug;
  title: string;
  tagline: string;
  description: string;
  category: StarterCategory;
  framework: string;
  icon: "chat" | "docs" | "web";
  features: string[];
  requirements: string[];
  setup: string;
  previewCode: string;
  devstackTemplateId: "nextjs-ai-chat" | "static-website";
  devstackUrl: string;
  tryUrl: string;
  guideUrl: string;
  downloadUrl: string;
  bytes: number;
  fileCount: number;
  sha256: string;
}
const specs = [
  {
    slug: "streaming-chat" as const,
    title: "Streaming Chat",
    tagline: "Your first working AI interface.",
    category: "Chat" as const,
    framework: "Next.js · AI SDK 6",
    icon: "chat" as const,
    description:
      "เริ่มด้วยแชทที่สตรีมจริง พร้อม BYOK ของ OpenAI, ปุ่มหยุด และ tool ดูเวลา ไม่ต้องพึ่ง npm package ของ ai-sdk.pro ที่ยังไม่เผยแพร่",
    features: [
      "UI message streaming",
      "OpenAI BYOK",
      "Time tool",
      "Stop generation",
    ],
    requirements: [
      "Node.js 22 และ npm",
      "API key ของ OpenAI สำหรับส่งข้อความจริง",
      "APP_ORIGIN ตรงกับโดเมนเมื่อจะโฮสต์",
    ],
    setup: "cd streaming-chat\nnpm install\nnpm run dev",
    previewCode:
      'const agent = new ToolLoopAgent({\n  model: openai("gpt-5-mini"),\n  tools: { getCurrentTime },\n  stopWhen: stepCountIs(8),\n});',
    devstackTemplateId: "nextjs-ai-chat" as const,
    prompt:
      "ใช้ searchDocs อธิบายวิธีเริ่ม Streaming Chat starter จากหน้า Templates และวิธี BYOK โดยไม่เก็บ API key ใน storage",
  },
  {
    slug: "docs-assistant" as const,
    title: "Docs Assistant",
    tagline: "Give your agent something useful to know.",
    category: "Agents" as const,
    framework: "Next.js · AI SDK 6",
    icon: "docs" as const,
    description:
      "แชทกับ agent ที่ค้น knowledge snippets ในโปรเจกต์จริง แก้เนื้อหาของคุณเองได้ โดยไม่ต้องตั้ง vector database หรืออ้างว่าเป็น RAG เต็มระบบ",
    features: [
      "Local knowledge search",
      "Source references",
      "OpenAI BYOK",
      "Bounded tool loop",
    ],
    requirements: [
      "Node.js 22 และ npm",
      "API key ของ OpenAI สำหรับส่งข้อความจริง",
      "แก้ snippets ใน lib/knowledge.ts ให้ตรงเนื้อหาของคุณ",
    ],
    setup: "cd docs-assistant\nnpm install\nnpm run dev",
    previewCode:
      "const searchKnowledge = tool({\n  inputSchema: z.object({ query: z.string() }),\n  execute: ({ query }) => searchLocalDocs(query),\n});",
    devstackTemplateId: "nextjs-ai-chat" as const,
    prompt:
      "ใช้ searchDocs อธิบาย Docs Assistant starter, local knowledge search และข้อแตกต่างจาก vector RAG พร้อมขั้นตอนใช้งานจริง",
  },
  {
    slug: "agent-launchpad" as const,
    title: "Agent Launchpad",
    tagline: "A clear home for the thing you built.",
    category: "Web" as const,
    framework: "Static HTML · Node.js",
    icon: "web" as const,
    description:
      "เว็บไซต์เริ่มต้นที่แก้ข้อความและลิงก์เครื่องมือได้ มีตัวอย่างคัดลอกโค้ดและ build เป็นไฟล์ static โดยไม่มีคีย์ AI หรือบริการเสียเงินเป็น dependency",
    features: [
      "Static site output",
      "Editable tool links",
      "Copyable examples",
      "No AI key required",
    ],
    requirements: [
      "Node.js 22 และ npm",
      "แก้ชื่อเว็บและลิงก์ใน public/index.html",
      "ใช้ dist เป็น output directory เมื่อโฮสต์",
    ],
    setup:
      "cd agent-launchpad\nnpm install\nnpm run dev\n# production: npm run build",
    previewCode:
      '<a href="https://ai-sdk.pro/chat">\n  Try the real agent playground\n</a>\n<!-- Edit the link for your own tool. -->',
    devstackTemplateId: "static-website" as const,
    prompt:
      "ใช้ searchDocs อธิบาย Agent Launchpad starter วิธี build เป็น static site และนำ source ไปเลือก deploy ใน DevStack โดยไม่ส่ง key อัตโนมัติ",
  },
];
export const starterTemplates: StarterTemplate[] = specs.map(
  ({ prompt, ...spec }) => ({
    ...spec,
    devstackUrl: `https://devstack.bid/templates/${spec.devstackTemplateId}`,
    tryUrl: `/chat?prompt=${encodeURIComponent(prompt)}`,
    guideUrl: "/docs/using-templates",
    downloadUrl: `/starters/${starterArchives[spec.slug].fileName}`,
    bytes: starterArchives[spec.slug].bytes,
    fileCount: starterArchives[spec.slug].fileCount,
    sha256: starterArchives[spec.slug].sha256,
  })
);
export function getStarter(slug: string): StarterTemplate | undefined {
  return starterTemplates.find(item => item.slug === slug);
}
