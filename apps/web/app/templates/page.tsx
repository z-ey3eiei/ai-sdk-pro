import type { Metadata } from "next";
import { Footer } from "@aisdkpro/ui";
import SiteHeader from "@/components/SiteHeader";
import TemplatesCatalog from "@/components/templates/TemplatesCatalog";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { starterTemplates } from "@/lib/starter-catalog";

export const metadata: Metadata = createSeoMetadata({
  title: "AI agent starter templates",
  description:
    "Download AI agent starters for streaming chat, local documentation search, and static websites. Get source code, setup steps, and a clear DevStack handoff.",
  path: "/templates",
  keywords: [
    "AI agent starters",
    "streaming chat template",
    "documentation assistant",
    "AI SDK 6 examples",
    "self-hosted AI",
  ],
});

export default function TemplatesPage() {
  return (
    <>
      <SiteHeader active="templates" />
      <main className="templates-page">
        <section className="templates-page-intro">
          <div className="templates-page-container">
            <span className="templates-page-kicker">
              TEMPLATE CATALOG · เริ่มจาก source ที่ตรวจสอบได้
            </span>
            <h1>เริ่มต้นโปรเจกต์ AI จากตัวอย่างที่พร้อมต่อยอด</h1>
            <p>
              เลือก starter ตามงานที่ต้องการ ดู framework และไฟล์ประกอบ
              จากนั้นดาวน์โหลด source ไปตรวจสอบและพัฒนาต่อในเครื่องของคุณ
            </p>
          </div>
        </section>
        <TemplatesCatalog templates={starterTemplates} />
      </main>
      <Footer />
    </>
  );
}
