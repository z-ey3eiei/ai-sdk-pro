import { docs } from "../../../docs/lib/content";
export function GET() {
  const text =
    "# ai-sdk.pro\n\nIndependent, self-hostable AI agent platform. Not an official Vercel product.\n\n## Documentation\n\n" +
    docs
      .map(
        doc =>
          `- [${doc.title}](https://ai-sdk.pro/docs/${doc.slug}): ${doc.description}`
      )
      .join("\n") +
    "\n\n## Official AI SDK source\n\n- https://ai-sdk.dev/docs\n";
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
