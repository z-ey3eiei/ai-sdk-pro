import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Download,
  FileText,
  Globe2,
  MessageSquare,
} from "lucide-react";
import { ButtonLink, CodeBlock } from "@aisdkpro/ui";
import type { StarterTemplate } from "@/lib/starter-catalog";
import { formatArchiveSize } from "./template-utils";

export default function StarterDetail({
  template,
}: {
  template: StarterTemplate;
}) {
  const Icon =
    template.icon === "chat"
      ? MessageSquare
      : template.icon === "docs"
        ? FileText
        : Globe2;

  return (
    <>
      <div className="starter-detail-container">
        <nav className="starter-detail-breadcrumb" aria-label="Breadcrumb">
          <Link href="/templates">เทมเพลต</Link>
          <span aria-hidden="true">/</span>
          <span>{template.title}</span>
        </nav>

        <header className="starter-detail-header">
          <div>
            <div className="starter-detail-title-row">
              <span className="starter-detail-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={1.6} />
              </span>
              <div>
                <span className="starter-detail-kicker">
                  STARTER · {template.category}
                </span>
                <h1>{template.title}</h1>
              </div>
            </div>
            <p className="starter-detail-tagline">{template.tagline}</p>
            <p className="starter-detail-description">{template.description}</p>
          </div>
          <p className="starter-detail-framework">
            <strong>เทคโนโลยีและข้อมูล</strong>
            {template.framework}
            <br />
            ai-sdk.pro starter · DevStack recipe: {template.devstackTemplateId}
          </p>
        </header>

        <div className="starter-detail-actions">
          <a
            className="starter-detail-deploy"
            href={template.devstackUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            เปิด DevStack <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a
            className="starter-detail-download"
            href={template.downloadUrl}
            download
          >
            ดาวน์โหลด source <Download size={14} aria-hidden="true" />
          </a>
          <Link className="starter-detail-link" href={template.tryUrl}>
            ลองถาม agent <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          <Link className="starter-detail-link" href={template.guideUrl}>
            อ่านคู่มือ <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <p className="starter-detail-action-note">
          ลิงก์ “ลองถาม agent” เปิด main chat พร้อมข้อความที่เติมไว้เท่านั้น
          คุณกดส่งเอง ไม่มีการส่งอัตโนมัติ
        </p>

        <div className="starter-devstack-notice">
          <div>
            <strong>DevStack handoff: ตรวจสอบและยืนยันด้วยตัวคุณเอง</strong>
            <p>
              ปุ่มนี้พาไป DevStack เพื่อ login เลือก source และ review recipe
              ด้วยตัวเอง ไม่มีการอัปโหลดอัตโนมัติ ไม่มีการโอน API key
              และหน้านี้ไม่อ้างว่า deploy เสร็จแล้ว เทมเพลตนี้เป็น ai-sdk.pro
              starter ที่ map ไปยัง compatible DevStack recipe ไม่ใช่ source ที่
              DevStack generate และ source อาจไม่เหมือนกัน
            </p>
          </div>
          <a
            className="starter-devstack-notice-link"
            href={template.devstackUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            เปิด DevStack <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </div>

        <div className="starter-detail-content">
          <div>
            <section
              className="starter-detail-section"
              aria-labelledby="starter-preview-title"
            >
              <h2 id="starter-preview-title">ตัวอย่างโค้ด</h2>
              <p className="starter-preview-note">
                ภาพด้านล่างเป็น static code/mock preview
                เพื่ออธิบายโครงสร้างเท่านั้น ไม่ใช่ live response
                และไม่มีการเรียก model จากหน้านี้
              </p>
              <div className="starter-code-wrap">
                <CodeBlock
                  code={template.previewCode}
                  filename={`${template.slug} · illustrative preview`}
                  language={template.icon === "web" ? "html" : "typescript"}
                />
              </div>
            </section>

            <section
              className="starter-detail-section"
              aria-labelledby="starter-setup-title"
            >
              <h2 id="starter-setup-title">เริ่มใช้งานในเครื่อง</h2>
              <p>
                ดาวน์โหลด archive แล้วรันคำสั่งด้านล่างในเครื่องของคุณ
                คำสั่งนี้เป็น local setup เท่านั้น ไม่มีการส่ง source หรือ key
                ออกจากเครื่อง
              </p>
              <div className="starter-code-wrap">
                <CodeBlock
                  code={template.setup}
                  filename="terminal"
                  language="bash"
                />
              </div>
            </section>

            <section
              className="starter-detail-section"
              aria-labelledby="starter-features-title"
            >
              <h2 id="starter-features-title">สิ่งที่รวมใน starter นี้</h2>
              <ul className="starter-feature-list">
                {template.features.map(feature => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="starter-detail-sidebar">
            <section
              className="starter-archive-card"
              aria-labelledby="starter-archive-title"
            >
              <h2 id="starter-archive-title">รายละเอียดไฟล์ archive</h2>
              <dl className="starter-archive-list">
                <div>
                  <dt>Files</dt>
                  <dd>{template.fileCount}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{formatArchiveSize(template.bytes)}</dd>
                </div>
                <div>
                  <dt>SHA-256</dt>
                  <dd>
                    <code>{template.sha256}</code>
                  </dd>
                </div>
              </dl>
            </section>

            <section
              className="starter-local-guide"
              aria-labelledby="starter-guide-title"
            >
              <h2 id="starter-guide-title">คู่มือและขั้นตอนถัดไป</h2>
              <p>
                คู่มืออธิบาย BYOK, local setup และวิธีตรวจ source ก่อนเปิด
                DevStack
              </p>
              <ButtonLink href={template.guideUrl} secondary>
                เปิด local guide <ArrowUpRight size={13} aria-hidden="true" />
              </ButtonLink>
            </section>

            <section
              className="starter-detail-section starter-requirements-section"
              aria-labelledby="starter-requirements-title"
            >
              <h2 id="starter-requirements-title">สิ่งที่ต้องเตรียม</h2>
              <ul className="starter-requirement-list">
                {template.requirements.map(requirement => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </section>

            <Link className="starter-workspace-link" href="/workspace">
              <Check size={13} aria-hidden="true" /> ดู repository snapshots ใน
              Workspace
            </Link>
            <a
              className="starter-contact-link"
              href="mailto:sdkbank@1origin.dev"
            >
              มีคำถามเกี่ยวกับ starter? ติดต่อ sdkbank@1origin.dev
            </a>
          </aside>
        </div>
      </div>
    </>
  );
}
