import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Braces,
  CheckCircle2,
  CircleHelp,
  Cloud,
  GitBranch,
  LockKeyhole,
  Server,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";
import { ButtonLink, Footer } from "@aisdkpro/ui";
import SiteHeader from "../components/SiteHeader";
import HomeFAQ from "../components/HomeFAQ";
import {
  createSeoMetadata,
  HOME_PAGE_TITLE,
  SITE_DESCRIPTION,
} from "../lib/seo-metadata";

export const metadata: Metadata = {
  ...createSeoMetadata({
    title: HOME_PAGE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
    locale: "th_TH",
    keywords: [
      "server-side web build workbench",
      "website deployment UI prototype",
      "terminal deployment workflow",
      "AI SDK platform",
      "self-hosted web application",
    ],
  }),
  title: `${HOME_PAGE_TITLE} | ai-sdk.pro`,
};

const plannedStages = [
  {
    number: "01",
    icon: GitBranch,
    title: "เลือก source",
    detail: "Repository และ revision ที่ผู้ใช้ตรวจสอบ",
    status: "ตัวอย่างแนวคิด",
  },
  {
    number: "02",
    icon: Boxes,
    title: "Build ใน environment แยก",
    detail: "แยกโค้ดที่ไม่เชื่อถือออกจาก control plane",
    status: "ยังไม่เชื่อม runner",
  },
  {
    number: "03",
    icon: Terminal,
    title: "ตรวจผลก่อน deploy",
    detail: "แสดง logs, artifacts และคำเตือนก่อนอนุมัติ",
    status: "ยังไม่รันคำสั่ง",
  },
  {
    number: "04",
    icon: Cloud,
    title: "ส่งต่อไป target",
    detail: "เช่น Vercel, Cloudflare Workers หรือ VPS",
    status: "ยังไม่เชื่อม provider",
  },
];

const architectureCards = [
  {
    icon: Workflow,
    title: "Control plane",
    description:
      "หน้าเว็บจัดการ project, เลือกขั้นตอน และแสดงสถานะที่ผู้ใช้ตรวจสอบได้ ไม่ควรเป็น process ที่รัน source code จาก repository",
    state: "UI prototype",
  },
  {
    icon: Server,
    title: "Isolated build runner",
    description:
      "แนวทางที่วางไว้คือแยก terminal/build process ต่อ job จำกัดสิทธิ์และทรัพยากร แล้วส่งเฉพาะ artifact/log ที่จำเป็นกลับมา",
    state: "ยังไม่มี runner",
  },
  {
    icon: Cloud,
    title: "Deployment target",
    description:
      "Vercel, Cloudflare Workers และ VPS เป็นตัวอย่าง target สำหรับออกแบบ adapter ภายหลัง ไม่ใช่ integration ที่เชื่อมจากหน้านี้",
    state: "ยังไม่เชื่อมต่อ",
  },
  {
    icon: LockKeyhole,
    title: "Server-side secrets",
    description:
      "Credential ที่ใช้จริงควรอยู่ใน secret store ฝั่ง server และถูกส่งให้ job เฉพาะเมื่อจำเป็น ไม่ใส่ key ลงหน้าเว็บหรือ log",
    state: "ยังไม่รับ credential",
  },
];

const availableNow = [
  {
    icon: GitBranch,
    title: "GitHub repository workspace",
    description:
      "ลงชื่อเข้าใช้เพื่อดู repository ที่ได้รับอนุญาตและนำเข้า bounded, read-only snapshot ได้ โค้ดใน snapshot ไม่ถูก build, execute หรือ deploy",
    status: "ใช้งานได้ตาม config",
    href: "/workspace",
    action: "เปิด Workspace",
  },
  {
    icon: Boxes,
    title: "Starter catalog",
    description:
      "เลือกดูและดาวน์โหลด starter source พร้อม local setup guide; ลิงก์ DevStack เป็น handoff ที่ให้ผู้ใช้ตรวจเอง ไม่มีการ upload หรือ deploy อัตโนมัติ",
    status: "ดาวน์โหลด source ได้",
    href: "/templates",
    action: "ดู starters",
  },
  {
    icon: Braces,
    title: "AI agent playground",
    description:
      "ทดสอบ streaming agent ที่มีอยู่ด้วย provider key ของคุณเอง คีย์อยู่ใน memory ของ tab และไม่ใช่ credential สำหรับ deployment",
    status: "BYOK playground",
    href: "/chat",
    action: "เปิด Playground",
  },
  {
    icon: BookOpen,
    title: "คู่มือ self-hosting",
    description:
      "อ่านขั้นตอน deploy ตัว ai-sdk.pro เองด้วย Docker/Caddy คู่มือนี้เป็นของแอปนี้ ไม่ใช่ระบบ build/deploy repository ทั่วไปในหน้าต้นแบบ",
    status: "เอกสารพร้อมอ่าน",
    href: "/docs/self-hosting",
    action: "อ่านคู่มือ",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader active="studio" />
      <main className="product-home">
        <section className="product-hero" aria-labelledby="product-title">
          <div className="product-hero-grid" aria-hidden="true" />
          <div className="product-home-container product-hero-layout">
            <div className="product-hero-copy">
              <span className="product-eyebrow">
                <span className="product-eyebrow-dot" aria-hidden="true" />
                SERVER-SIDE WEB WORKBENCH · FRONTEND PREVIEW
              </span>
              <h1 id="product-title">
                จาก repository
                <br />
                <span>สู่ deploy ที่ควบคุมได้</span>
              </h1>
              <p className="product-hero-lead">
                แนวคิด workspace สำหรับสร้างเว็บและจัดการขั้นตอน build/deploy
                ผ่าน server-side terminal โดยออกแบบให้แยก source, runner,
                credential และ deployment target ออกจากกันอย่างตรวจสอบได้
              </p>
              <div className="product-hero-actions">
                <ButtonLink href="/studio">
                  สำรวจ UI prototype <ArrowRight size={16} />
                </ButtonLink>
                <ButtonLink href="/docs/architecture" secondary>
                  ดู architecture
                </ButtonLink>
              </div>
              <div className="product-honesty-note" role="note">
                <CircleHelp size={17} aria-hidden="true" />
                <p>
                  <strong>สถานะปัจจุบัน:</strong> หน้านี้เป็น frontend prototype
                  — ยังไม่เชื่อม terminal, build runner, Vercel, Cloudflare หรือ VPS
                  สำหรับ deployment ในผลิตภัณฑ์
                </p>
              </div>
            </div>

            <aside className="product-flow-card" aria-label="ตัวอย่าง workflow ที่วางแผนไว้">
              <div className="product-flow-card-head">
                <div>
                  <span className="product-card-kicker">PROPOSED WORKFLOW</span>
                  <h2>จาก source ไป target</h2>
                </div>
                <span className="product-status-pill product-status-planned">
                  แนวคิดเท่านั้น
                </span>
              </div>
              <ol className="product-stage-list">
                {plannedStages.map(stage => {
                  const Icon = stage.icon;
                  return (
                    <li key={stage.number}>
                      <span className="product-stage-index">{stage.number}</span>
                      <span className="product-stage-icon"><Icon size={16} /></span>
                      <span className="product-stage-copy">
                        <strong>{stage.title}</strong>
                        <span>{stage.detail}</span>
                      </span>
                      <span className="product-stage-status">{stage.status}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="product-flow-footnote">
                ลำดับนี้เป็น architecture sketch ไม่ใช่ deployment job หรือ log
                จากระบบจริง
              </p>
            </aside>
          </div>
        </section>

        <section className="product-architecture" aria-labelledby="architecture-title">
          <div className="product-home-container">
            <header className="product-section-heading">
              <span className="product-section-kicker">SAFETY BY DESIGN</span>
              <h2 id="architecture-title">แต่ละส่วนมีขอบเขตของตัวเอง</h2>
              <p>
                Build จาก source ที่ผู้ใช้เลือกควรทำงานใน environment ที่แยกจากเว็บควบคุม
                และไม่เข้าถึง secret หรือข้อมูลของระบบโดยปริยาย
              </p>
            </header>
            <div className="product-architecture-grid">
              {architectureCards.map(({ icon: Icon, title, description, state }) => (
                <article className="product-info-card" key={title}>
                  <div className="product-info-card-top">
                    <span className="product-info-icon"><Icon size={18} /></span>
                    <span className="product-status-pill">{state}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <div className="product-security-callout">
              <ShieldCheck size={19} aria-hidden="true" />
              <p>
                <strong>หลักการสำคัญ:</strong> ไม่รัน repository code ใน web app container
                และไม่ส่ง GitHub, SSH, database หรือ provider secret ไปยัง browser,
                untrusted build process หรือ log ที่ผู้ใช้ทั่วไปเข้าถึงได้
              </p>
            </div>
          </div>
        </section>

        <section className="product-current" id="features" aria-labelledby="current-title">
          <div className="product-home-container">
            <header className="product-section-heading product-section-heading-row">
              <div>
                <span className="product-section-kicker">AVAILABLE IN AI-SDK.PRO TODAY</span>
                <h2 id="current-title">สิ่งที่ใช้งานได้จริงในตอนนี้</h2>
                <p>
                  แยกความสามารถปัจจุบันออกจากหน้าต้นแบบ เพื่อให้รู้ว่าปุ่มแต่ละจุดพาไปไหน
                  และอะไรยังไม่เกิดขึ้น
                </p>
              </div>
              <Link className="product-text-link" href="/docs/getting-started">
                เริ่มจากคู่มือ <ArrowRight size={15} />
              </Link>
            </header>
            <div className="product-current-grid">
              {availableNow.map(({ icon: Icon, title, description, status, href, action }) => (
                <article className="product-current-card" key={title}>
                  <div className="product-current-card-head">
                    <span className="product-info-icon"><Icon size={18} /></span>
                    <span className="product-status-pill product-status-live">
                      <CheckCircle2 size={13} /> {status}
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <Link href={href} className="product-card-action">
                    {action} <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
            <p className="product-current-note">
              สถานะจริงอาจขึ้นกับ environment และการตั้งค่า integration ของเจ้าของระบบ
              Workspace เป็น read-only snapshot; ไม่ใช่ build/deploy pipeline
            </p>
          </div>
        </section>

        <section className="product-next-steps" aria-labelledby="next-steps-title">
          <div className="product-home-container product-next-layout">
            <div className="product-next-copy">
              <span className="product-section-kicker">EXPLORE THE FRONTEND</span>
              <h2 id="next-steps-title">เดินดูแต่ละขั้นตอนก่อนต่อ backend</h2>
              <p>
                หน้า Studio แสดงโครงสร้าง project, terminal targets, deployments และ settings
                ด้วยข้อมูลตัวอย่างที่ติดป้ายไว้ชัดเจน ไม่มีคำสั่งถูกส่งไปรัน
              </p>
              <Link className="product-text-link" href="/studio/projects/new">
                เปิด project setup guide <ArrowRight size={15} />
              </Link>
            </div>
            <div className="product-next-links">
              <Link href="/studio/projects">
                <span className="product-next-link-icon"><GitBranch size={17} /></span>
                <span><strong>Projects</strong><small>Source และสถานะตัวอย่าง</small></span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/studio/terminals">
                <span className="product-next-link-icon"><Terminal size={17} /></span>
                <span><strong>Build environments</strong><small>ขอบเขตของ runner และ safety</small></span>
                <ArrowRight size={15} />
              </Link>
              <Link href="/studio/deployments">
                <span className="product-next-link-icon"><Cloud size={17} /></span>
                <span><strong>Deployment flow</strong><small>Stages และข้อมูลประกอบการ review</small></span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="product-faq" aria-labelledby="product-faq-title">
          <div className="product-home-container product-faq-layout">
            <header className="product-faq-heading">
              <span className="product-section-kicker">CLARITY BEFORE CONNECTIONS</span>
              <h2 id="product-faq-title">คำถามที่ควรรู้ก่อนเริ่ม</h2>
              <p>
                แยก prototype, service ที่ใช้งานจริง และขั้นตอน handoff ออกจากกัน
              </p>
            </header>
            <HomeFAQ />
          </div>
        </section>

        <section className="product-final-cta">
          <div className="product-home-container">
            <span className="product-section-kicker">A FRONTEND CONCEPT, READY FOR REVIEW</span>
            <h2>เริ่มจาก UI ที่เข้าใจง่าย<br />แล้วค่อยต่อระบบที่ปลอดภัย</h2>
            <p>
              ตรวจหน้าต้นแบบและ workflow ก่อนเลือกว่าจะต่อ repository, runner
              และ deployment targets อย่างไร
            </p>
            <div className="product-hero-actions product-final-actions">
              <ButtonLink href="/studio">เปิด Studio prototype <ArrowRight size={16} /></ButtonLink>
              <ButtonLink href="/docs/architecture" secondary>อ่าน architecture</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
