import { starterTemplates } from "../../../lib/starter-catalog";

export function GET() {
  return Response.json(
    {
      templates: starterTemplates,
      deployment: {
        type: "external-handoff",
        provider: "DevStack",
        automaticUpload: false,
        automaticDeployment: false,
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
