import type { Metadata } from "next";
import { ButtonLink } from "@aisdkpro/ui";
import SiteHeader from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: "Deploy",
  description: "Deploy GitHub projects to ai-sdk.pro through Cloudflare.",
};

const dashboard = "https://deploy-staging.ai-sdk.pro";

async function dashboardReady() {
  try {
    const health = await fetch(`${dashboard}/health`, {
      signal: AbortSignal.timeout(2500),
      redirect: "error",
      next: { revalidate: 30 },
    });
    if (!health.ok || !health.headers.get("content-type")?.includes("application/json")) return false;
    return (await health.json()).status === "ok";
  } catch {
    return false;
  }
}

export default async function DeployPage() {
  const ready = await dashboardReady();
  return (
    <>
      <SiteHeader active="deploy" />
      <main>
        <section className="reference-deploy">
          <div className="reference-container deploy-layout">
            <div>
              <h1>Deploy โปรเจกต์จาก GitHub</h1>
              <p>นำเข้า repository แล้วเผยแพร่เป็นเว็บที่ชื่อโปรเจกต์.ai-sdk.pro ผ่าน Cloudflare</p>
              {ready ? (
                <ButtonLink href={dashboard}>เปิด Deploy Dashboard</ButtonLink>
              ) : (
                <p role="status">Deploy Dashboard ยังไม่ออนไลน์</p>
              )}
            </div>
            <div className="deploy-command-panel">
              <h2>ขั้นตอนการ Deploy</h2>
              <ol>
                <li>ลงชื่อเข้าใช้และเลือก GitHub repository</li>
                <li>ตั้ง branch และกด Deploy</li>
                <li>ดู URL และ Build logs ใน Dashboard</li>
              </ol>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
