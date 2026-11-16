"use client";

import Link from "next/link";
import { useMemo } from "react";

const origin =
  process.env.NEXT_PUBLIC_DEPLOY_DASHBOARD_ORIGIN ??
  "https://deploy-staging.ai-sdk.pro";

function buildFrameUrl(repoHint?: string | null) {
  const base = `${origin.replace(/\/$/, "")}/?embed=1`;
  if (!repoHint?.trim()) return base;
  return `${base}&repo=${encodeURIComponent(repoHint.trim())}`;
}

export default function DeployEmbed({
  ready,
  variant = "site",
  repoHint,
}: {
  ready: boolean;
  variant?: "site" | "workspace";
  repoHint?: string | null;
}) {
  const frameUrl = useMemo(() => buildFrameUrl(repoHint), [repoHint]);

  if (!ready) {
    return (
      <div
        className={variant === "workspace" ? "workspace-deploy-offline" : "reference-container deploy-page-intro"}
      >
        <div className="deploy-embed-offline" role="status">
          <span className="section-eyebrow">DEPLOY PILOT</span>
          <h1 className={variant === "workspace" ? "workspace-deploy-offline-title" : "deploy-page-title"}>
            แผง Deploy ชั่วคราวออฟไลน์
          </h1>
          <p className="section-intro">ลองใหม่ภายหลัง หรือเปิดแผงตรงที่ {origin}</p>
        </div>
      </div>
    );
  }

  if (variant === "workspace") {
    return (
      <div className="workspace-deploy-embed">
        <p className="workspace-deploy-embed-note">
          ล็อกอิน GitHub ในแผงนี้ (session ของ pilot แยกจาก Workspace จนกว่าจะรวม auth) แล้วนำเข้า repo เพื่อเผยแพร่เป็น{" "}
          <strong>ชื่อโปรเจกต์.ai-sdk.pro</strong>
        </p>
        <div className="deploy-embed-chrome workspace-deploy-embed-chrome">
          <iframe
            title="ai-sdk.pro Deploy"
            src={frameUrl}
            className="deploy-embed-frame workspace-deploy-embed-frame"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-read; clipboard-write"
          />
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
          หน้านี้ย้ายไปที่{" "}
          <Link href="/workspace/deploy" className="deploy-page-link">
            Workspace → Deploy projects
          </Link>
          {" "}แล้ว — นำเข้า snapshot และเผยแพร่ใช้เส้นทางเดียวกัน
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