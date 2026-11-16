"use client";

import Link from "next/link";

const origin =
  process.env.NEXT_PUBLIC_DEPLOY_DASHBOARD_ORIGIN ??
  "https://deploy-staging.ai-sdk.pro";

const frameUrl = `${origin.replace(/\/$/, "")}/?embed=1`;

export default function DeployEmbed({ ready }: { ready: boolean }) {
  if (!ready) {
    return (
      <div className="reference-container deploy-page-intro">
        <div className="deploy-embed-offline" role="status">
          <span className="section-eyebrow">DEPLOY PILOT</span>
          <h1 className="deploy-page-title">แผง Deploy ชั่วคราวออฟไลน์</h1>
          <p className="section-intro">ลองใหม่ภายหลัง หรือเปิดแผงตรงที่ {origin}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="deploy-embed-layout">
      <section className="reference-container deploy-page-intro">
        <span className="section-eyebrow">DEPLOY PILOT</span>
        <h1 className="deploy-page-title">เผยแพร่โปรเจกต์จาก GitHub</h1>
        <p className="section-intro">
          ล็อกอิน GitHub ในแผงด้านล่าง (ครั้งแรกของ pilot) แล้วนำเข้า repository
          เพื่อเผยแพร่เป็น <strong>ชื่อโปรเจกต์.ai-sdk.pro</strong>
          การนำเข้า snapshot ใน{" "}
          <Link href="/workspace" className="deploy-page-link">
            Workspace
          </Link>{" "}
          ยังเป็นขั้นตอนแยกสำหรับดูโค้ด read-only
        </p>
      </section>
      <div className="deploy-embed-chrome reference-container">
        <iframe
          title="ai-sdk.pro Deploy"
          src={frameUrl}
          className="deploy-embed-frame"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}