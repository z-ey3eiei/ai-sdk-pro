import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { docs } from "@/lib/content";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SelfHostingActions } from "@/components/SelfHostingActions";

const siteUrl = "https://ai-sdk.pro";
const selfHostingAgentPrompt = [
  "คุณคือผู้ช่วย deploy ai-sdk.pro ไปยัง VPS ที่เจ้าของระบบอนุญาตให้ใช้งาน",
  "ทำตามคู่มือ Self-Hosting: Node 22, pnpm 10.18.0, Docker Compose และ Caddy โดยตรวจ repository, ระบบปฏิบัติการ, services ปัจจุบัน และแผน rollback ก่อนเริ่ม",
  "ใช้ผู้ใช้ deploy ที่ไม่ใช่ root สำหรับงานประจำวัน อ่านค่า secret จากไฟล์ .env ฝั่ง server เท่านั้น ห้ามขอให้ผู้ใช้วาง secret ในหน้าเว็บหรือแชต ห้ามพิมพ์ secret ลง log, commit ลง Git หรือ bake ลง container image และคง permission ของ .env เป็น 600",
  "ตรวจ Caddy ให้ส่ง streaming ผ่านโดยไม่ buffer ด้วย flush_interval -1 จากนั้นสร้างและเริ่ม Compose ตามคู่มือ ตรวจสถานะด้วย docker compose ps/logs และทดสอบ endpoint ด้วย curl -N เพื่อยืนยันว่า chunks ไหลต่อเนื่อง",
  "ห้ามทำลายข้อมูล เปลี่ยน DNS/firewall หรือทำให้ production downtime โดยไม่ขออนุมัติล่วงหน้า ห้ามอ้างว่าสำเร็จหากไม่มีผลตรวจยืนยัน หากติดขัดให้หยุดและแจ้งสิ่งที่ต้องการ",
  "สรุป VPS/commit ที่ใช้ การเปลี่ยนแปลง services ผลตรวจสุขภาพ/stream และคำสั่ง rollback โดยไม่เปิดเผยค่า secret",
].join("\n\n");

function findDoc(slug?: string[]) {
  return docs.find(doc => doc.slug === slug?.join("/"));
}

export const dynamicParams = false;

export function generateStaticParams() {
  return docs.map(doc => ({ slug: [doc.slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug?.length) redirect("/docs/getting-started");

  const doc = findDoc(slug);
  if (!doc) notFound();

  const title =
    doc.slug === "client-sdk"
      ? "Client SDK Guide & Usage"
      : `${doc.title} Guide`;
  const image = `/docs/og?slug=${encodeURIComponent(doc.slug)}`;
  return {
    title,
    description: doc.description,
    keywords: [
      doc.title,
      "คู่มือ AI agent",
      "AI SDK documentation",
      "พัฒนา AI agent",
    ],
    alternates: { canonical: `${siteUrl}/docs/${doc.slug}` },
    openGraph: {
      type: "article",
      locale: "th_TH",
      siteName: "ai-sdk.pro",
      url: `${siteUrl}/docs/${doc.slug}`,
      title: `${title} | ai-sdk.pro`,
      description: doc.description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} — ai-sdk.pro`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ai-sdk.pro`,
      description: doc.description,
      images: [image],
    },
  };
}

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug?.length) redirect("/docs/getting-started");

  const doc = findDoc(slug);
  if (!doc) notFound();

  const body = doc.body.replace(/^# [^\n]+\n?/, "").trim();
  return (
    <DocsPage
      className={`docs-page${doc.slug === "self-hosting" ? " docs-page-self-hosting" : ""}`}
      tableOfContent={{ enabled: false }}
      breadcrumb={{ enabled: true }}
      footer={{ enabled: false }}
    >
      {doc.slug === "self-hosting" ? (
        <div className="docs-context-note" role="note">
          <strong>เกี่ยวกับเอกสารนี้</strong> เนื้อหาอธิบาย AI SDK
          และแนวทางสำหรับโปรเจกต์ของคุณ
          ตัวอย่างและการตั้งค่าที่กล่าวถึงไม่ได้หมายความว่ามี server, terminal
          หรือ deploy เชื่อมต่อจากหน้านี้
        </div>
      ) : null}
      <DocsTitle className="docs-page-title">{doc.title}</DocsTitle>
      <DocsDescription>{doc.description}</DocsDescription>
      {doc.slug === "self-hosting" ? (
        <SelfHostingActions
          markdown={doc.body.trim()}
          agentPrompt={selfHostingAgentPrompt}
        />
      ) : null}
      <DocsBody>
        <MarkdownContent content={body} />
      </DocsBody>
    </DocsPage>
  );
}
