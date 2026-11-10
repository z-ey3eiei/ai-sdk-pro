import { publicModelConfig } from "@/lib/provider";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(publicModelConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}
