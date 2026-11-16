import type { Metadata } from "next";
import DeployEmbed from "../../components/DeployEmbed";
import SiteHeader from "../../components/SiteHeader";

const dashboard =
  process.env.DEPLOY_DASHBOARD_ORIGIN ?? "https://deploy-staging.ai-sdk.pro";

export const metadata: Metadata = {
  title: "Deploy",
  description:
    "Import GitHub repositories and publish static sites to *.ai-sdk.pro through the Cloudflare deployment dashboard.",
};

async function dashboardReady() {
  try {
    const health = await fetch(`${dashboard}/health`, {
      signal: AbortSignal.timeout(2500),
      redirect: "follow",
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
      <main className="deploy-page-shell">
        <DeployEmbed ready={ready} />
      </main>
    </>
  );
}