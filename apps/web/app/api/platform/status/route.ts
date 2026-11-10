import { noStoreHeaders, platformStatus } from "@/lib/platform-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(platformStatus(), { headers: noStoreHeaders() });
}
