import { createAssistantAgent } from "../agents/assistant-agent";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const response = await originalFetch(input, init);
  if (String(input).includes("chat/completions")) {
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : {};
    console.log("Request fields:", Object.keys(body).join(", "));
    console.log(
      "Provider status/type:",
      response.status,
      response.headers.get("content-type")
    );
    console.log(
      "Response preview:",
      (await response.clone().text()).slice(0, 2200)
    );
  }
  return response;
};
async function main() {
  const { agent, close } = await createAssistantAgent();
  try {
    const result = await agent.generate({
      prompt:
        "Use getCurrentTime for UTC and tell me the time in one sentence.",
      abortSignal: AbortSignal.timeout(60000),
    });
    console.log(result.text);
  } finally {
    await close();
  }
}
void main().catch(error => {
  console.error(error instanceof Error ? error.message : "Provider error");
  process.exitCode = 1;
});
