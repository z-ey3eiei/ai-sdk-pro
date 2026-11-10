import { createOpenAI } from "@ai-sdk/openai";
import {
  createAgentUIStreamResponse,
  stepCountIs,
  ToolLoopAgent,
  tool,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { searchLocalDocs } from "../../../lib/knowledge";
import {
  isAllowedOrigin,
  MAX_REQUEST_MS,
  PolicyError,
  readLimitedBody,
  requestSchema,
} from "../../../lib/request-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_ERROR = "The AI provider request failed. Check your key and try again.";

const searchKnowledge = tool({
  description:
    "Search the editable local knowledge snippets. This is keyword search, not remote or vector retrieval.",
  inputSchema: z.object({ query: z.string().trim().min(1).max(160) }),
  execute: async ({ query }) => searchLocalDocs(query),
});

const tools = { searchKnowledge };

function responseHeaders() {
  return {
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  };
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: responseHeaders() });
}

export async function POST(request: Request) {
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(MAX_REQUEST_MS),
  ]);

  if (!isAllowedOrigin(request)) return fail("Origin is not allowed.", 403);

  try {
    const raw = await readLimitedBody(request, signal);
    let parsed: z.infer<typeof requestSchema>;
    try {
      parsed = requestSchema.parse(JSON.parse(raw));
    } catch {
      return fail("Expected a valid UI message list and an OpenAI key.", 400);
    }

    // Validate the UI message/tool shape before creating an OpenAI model.
    const messages = await validateUIMessages({
      messages: parsed.messages as UIMessage[],
    });

    const openai = createOpenAI({
      apiKey: parsed.byok.apiKey,
      baseURL: "https://api.openai.com/v1",
    });
    const agent = new ToolLoopAgent({
      model: openai("gpt-5-mini"),
      instructions:
        "You answer from the local snippets when useful. Call searchKnowledge for questions about this starter or AI SDK. Cite the returned sourceId values in your answer. If the snippets do not cover a question, say so instead of inventing documentation.",
      tools,
      stopWhen: stepCountIs(8),
      maxOutputTokens: 900,
      timeout: { totalMs: MAX_REQUEST_MS },
      providerOptions: {
        openai: { reasoningEffort: "low" },
      },
    });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      abortSignal: signal,
      timeout: { totalMs: MAX_REQUEST_MS },
      sendSources: false,
      onError: () => SAFE_ERROR,
      headers: responseHeaders(),
      keepAliveMs: 10_000,
    });
  } catch (error) {
    if (error instanceof PolicyError) return fail(error.message, error.status);
    if (signal.aborted) return fail("Request cancelled or timed out.", 408);
    return fail(SAFE_ERROR, 503);
  }
}
