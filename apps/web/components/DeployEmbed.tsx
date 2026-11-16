"use client";

const origin =
  process.env.NEXT_PUBLIC_DEPLOY_DASHBOARD_ORIGIN ??
  "https://deploy-staging.ai-sdk.pro";

export default function DeployEmbed({ ready }: { ready: boolean }) {
  if (!ready) {
    return (
      <div className="deploy-embed-offline" role="status">
        <p>Deploy Dashboard ยังไม่ออนไลน์ — ลองใหม่ภายหลังหรือไปที่ {origin}</p>
      </div>
    );
  }

  return (
    <div className="deploy-embed">
      <p className="deploy-embed-note">
        แผงด้านล่างเชื่อมกับ Cloudflare Deploy (ล็อกอิน GitHub ครั้งแรกในแผงนี้) — นำเข้าสแนปช็อตใน Workspace ใช้ดูโค้ดบน Neon คนละขั้นตอนกับเผยแพร่เว็บจาก Git
      </p>
      <iframe
        title="ai-sdk.pro Deploy"
        src={origin}
        className="deploy-embed-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}