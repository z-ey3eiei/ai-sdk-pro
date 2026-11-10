import { isBYOKRequired, publicBYOKProviders } from "@/lib/byok-policy";
import { publicModelConfig } from "@/lib/provider";

export const dynamic = "force-dynamic";

export function GET() {
  const owner = publicModelConfig();
  const byokRequired = isBYOKRequired();
  return Response.json(
    {
      byokEnabled: true,
      byokRequired,
      providers: publicBYOKProviders(),
      // Keep owner/server configuration observable separately from BYOK state.
      provider: owner.provider,
      model: owner.model,
      configured: owner.configured,
      providerConfigured: owner.configured,
      ownerProviderConfigured: owner.configured,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
