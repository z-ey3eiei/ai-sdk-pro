import { NextResponse } from "next/server";

const dashboard =
  process.env.DEPLOY_DASHBOARD_ORIGIN ?? "https://deploy-staging.ai-sdk.pro";

export async function GET() {
  try {
    const health = await fetch(`${dashboard.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(2500),
      redirect: "follow",
      cache: "no-store",
    });
    if (!health.ok || !health.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ ready: false });
    }
    const body = (await health.json()) as { status?: string };
    return NextResponse.json({ ready: body.status === "ok" });
  } catch {
    return NextResponse.json({ ready: false });
  }
}