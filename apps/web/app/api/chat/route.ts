import { createAgentUIStreamResponse } from "ai";
import { z } from "zod";
import { createAssistantAgent } from "@/agents/assistant-agent";
import {
  checkRateLimit,
  corsHeaders,
  isAllowedOrigin,
  requestIdentity,
} from "@/lib/chat-policy";
import { readLimitedBody, RequestPolicyError } from "@/lib/request-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string().min(1).max(200),
          role: z.enum(["user", "assistant"]),
          parts: z.array(z.unknown()).min(1).max(50),
        })
        .passthrough()
    )
    .min(1)
    .max(50),
});
export function OPTIONS(request: Request) {
  if (!isAllowedOrigin(request))
    return Response.json({ error: "Origin is not allowed." }, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120000)]);
  const headers = corsHeaders(request);
  headers.set("Cache-Control", "no-store");
  const fail = (error: string, status: number) =>
    Response.json({ error }, { status, headers });
  if (!isAllowedOrigin(request)) return fail("Origin is not allowed.", 403);
  if (!checkRateLimit(requestIdentity(request))) {
    headers.set("Retry-After", "60");
    return fail("Too many requests. Wait a minute, then retry.", 429);
  }
  let cleanup: (() => Promise<void>) | undefined;
  try {
    const raw = await readLimitedBody(request, signal);
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(JSON.parse(raw));
    } catch {
      return fail(
        "Expected messages with id, user/assistant role, and UIMessage parts.",
        400
      );
    }
    const { agent, close } = await createAssistantAgent(signal);
    cleanup = close;
    headers.set("Cache-Control", "no-store, no-transform");
    headers.set("X-Accel-Buffering", "no");
    const response = await createAgentUIStreamResponse({
      agent,
      uiMessages: body.messages,
      abortSignal: signal,
      onError: () =>
        "AI request failed. Check your server provider configuration and retry.",
      headers,
      keepAliveMs: 10000,
    });
    if (!response.body) {
      await close();
      return response;
    }
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (error) {
          try {
            controller.error(error);
          } catch {}
        } finally {
          await close();
        }
      },
      async cancel() {
        await reader.cancel();
        await close();
      },
    });
    return new Response(stream, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    await cleanup?.();
    if (error instanceof RequestPolicyError)
      return fail(error.message, error.status);
    if (signal.aborted) return fail("Request cancelled or timed out.", 408);
    const message =
      error instanceof Error &&
      error.message.startsWith("AI provider is not configured")
        ? error.message
        : "Unable to start the agent. Check provider and MCP settings on the server.";
    return fail(message, 503);
  }
}
