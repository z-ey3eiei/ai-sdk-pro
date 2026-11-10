import { publicModelConfig } from "@/lib/provider";
export const dynamic = "force-dynamic";
export function GET() {
  const { configured, model } = publicModelConfig();
  return Response.json(
    {
      status: configured ? "ready" : "not-configured",
      model,
      providerConfigured: configured,
      scope:
        "runtime configuration only; run a chat smoke test to verify provider credentials",
    },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
