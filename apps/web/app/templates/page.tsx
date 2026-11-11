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
              LEARN · START WITH SOURCE
            </span>
            <h1>Start with something that works.</h1>
            <p>
              เลือก starter ที่พร้อมให้ดาวน์โหลด แก้ต่อในเครื่อง
              และเรียนรู้เส้นทางจาก first prompt ไปสู่โปรเจกต์ของคุณเอง
            </p>
          </div>
        </section>
        <TemplatesCatalog templates={starterTemplates} />
      </main>
      <Footer />
    </>
  );
}
