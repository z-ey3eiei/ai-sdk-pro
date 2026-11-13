import Link from "next/link";
import { ArrowRight, BookOpen, FolderGit2, Layers3 } from "lucide-react";
import { ButtonLink, Header } from "@aisdkpro/ui";

const destinations = [
  {
    icon: Layers3,
    title: "Studio prototype",
    description: "ดูหน้าต้นแบบ workflow สำหรับ projects, build environments และ deployments",
    href: "/studio",
  },
  {
    icon: FolderGit2,
    title: "Repository workspace",
    description: "ดู repository snapshots ที่ได้รับอนุญาตแบบ read-only",
    href: "/workspace",
  },
  {
    icon: BookOpen,
    title: "คู่มือและเอกสาร",
    description: "ไปยัง getting started, architecture หรือ self-hosting guide",
    href: "/docs/getting-started",
  },
];

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="not-found-page">
        <div className="not-found-layout">
          <section className="not-found-message" aria-labelledby="not-found-title">
            <span className="not-found-code">404 · ไม่พบหน้านี้</span>
            <h1 id="not-found-title">ลิงก์นี้อาจเปลี่ยนไปแล้ว</h1>
            <p>
              หน้าที่เปิดไม่มีอยู่ในเส้นทางปัจจุบัน หรืออาจพิมพ์ URL ไม่ครบ
              เลือกทางไปต่อจากตัวเลือกด้านล่างได้เลย
            </p>
            <div className="not-found-actions">
              <ButtonLink href="/">กลับหน้าแรก</ButtonLink>
              <ButtonLink href="/studio" secondary>
                ดู Studio prototype <ArrowRight size={15} />
              </ButtonLink>
            </div>
          </section>
          <section className="not-found-destinations" aria-label="หน้าที่แนะนำ">
            <span className="not-found-section-label">เลือกเส้นทางที่ต้องการ</span>
            {destinations.map(({ icon: Icon, title, description, href }) => (
              <Link href={href} key={href}>
                <span className="not-found-destination-icon"><Icon size={17} /></span>
                <span className="not-found-destination-copy">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
            <p className="not-found-honesty-note">
              Studio เป็น frontend prototype; หน้า 404 นี้ไม่ได้เชื่อมกับ terminal หรือ deploy job
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
