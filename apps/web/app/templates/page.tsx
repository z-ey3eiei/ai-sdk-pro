import type { Metadata } from "next";
import { Footer } from "@aisdkpro/ui";
import SiteHeader from "@/components/SiteHeader";
import TemplatesCatalog from "@/components/templates/TemplatesCatalog";
import { starterTemplates } from "@/lib/starter-catalog";

const canonicalUrl = "https://ai-sdk.pro/templates";

export const metadata: Metadata = {
  title: "Starter templates",
  description:
    "ดาวน์โหลด starter ที่ใช้งานได้จริง เรียนรู้ขั้นตอน local setup และเลือก deploy บน DevStack ด้วยตัวเอง",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Starter templates · ai-sdk.pro",
    description:
      "Runnable starters, source downloads and a clear DevStack handoff.",
    url: canonicalUrl,
  },
};

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
