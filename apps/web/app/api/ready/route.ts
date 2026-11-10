import { isBYOKRequired } from "@/lib/byok-policy";
import { publicModelConfig } from "@/lib/provider";

export const dynamic = "force-dynamic";

export function GET() {
  const owner = publicModelConfig();
  const byokRequired = isBYOKRequired();
  const readyForRequestCredentials = byokRequired;
  const status = byokRequired
    ? "ready-for-byok"
    : owner.configured
      ? "ready"
      : "not-configured";

  return Response.json(
    {
      status,
      byokEnabled: true,
      byokRequired,
      provider: owner.provider,
      model: owner.model,
      providerConfigured: owner.configured,
      ownerProviderConfigured: owner.configured,
      // Readiness does not call a provider or validate a credential. Each chat
      // request must still supply and test a valid client-owned key.
      credentialsTested: false,
      scope: readyForRequestCredentials
        ? "runtime is ready for client-supplied BYOK credentials; each chat request supplies and tests its own key"
        : "runtime configuration only; run a chat smoke test to verify provider credentials",
    },
    {
      status: byokRequired || owner.configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
