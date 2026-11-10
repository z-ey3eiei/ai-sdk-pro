import { createAssistantAgent } from "../agents/assistant-agent";
async function main() {
  const { agent, close } = await createAssistantAgent();
  try {
    const result = await agent.generate({
      prompt:
        "Use the getCurrentTime tool for Asia/Bangkok and tell me the current time in one sentence.",
      abortSignal: AbortSignal.timeout(60000),
    });
    const calls = result.steps.flatMap(step => step.toolCalls);
    if (!calls.some(call => call.toolName === "getCurrentTime"))
      throw new Error("Smoke check did not call getCurrentTime.");
    console.log(
      "Agent tool calls:",
      calls.map(call => call.toolName).join(", ")
    );
    console.log("Answer:", result.text);
  } finally {
    await close();
  }
}
void main().catch(error => {
  console.error(error instanceof Error ? error.message : "Smoke check failed.");
  process.exitCode = 1;
});
