import { createAgentUIStreamResponse } from "ai";
import { z } from "zod";
import { createAssistantAgent } from "@/agents/assistant-agent";
import {
  BYOKPolicyError,
  requireBYOK,
  safeProviderErrorMessage,
  safeProviderStreamError,
  upstreamErrorStatus,
} from "@/lib/byok-policy";
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
  byok: z.unknown().optional(),
});

export function OPTIONS(request: Request) {
  if (!isAllowedOrigin(request))
    return Response.json({ error: "Origin is not allowed." }, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function streamHeaders(
  base: Headers,
  upstream: Headers
): Headers {
  const headers = new Headers(base);
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  const uiStreamVersion = upstream.get("x-vercel-ai-ui-message-stream");
  if (uiStreamVersion)
    headers.set("x-vercel-ai-ui-message-stream", uiStreamVersion);
  return headers;
}

export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120000)]);
  const headers = corsHeaders(request);
  headers.set("Cache-Control", "no-store");
  const fail = (error: string, status: number, retryAfter?: string) => {
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return Response.json({ error }, { status, headers });
  };
  if (!isAllowedOrigin(request)) return fail("Origin is not allowed.", 403);
  if (!checkRateLimit(requestIdentity(request)))
    return fail("Too many requests. Wait a minute, then retry.", 429, "60");

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

    let byok;
    try {
      byok = requireBYOK(body.byok);
    } catch (error) {
      if (error instanceof BYOKPolicyError)
        return fail(error.message, error.status);
      throw error;
    }

    const result = await createAssistantAgent(signal, byok);
    cleanup = result.close;
    headers.set("Cache-Control", "no-store, no-transform");
    headers.set("X-Accel-Buffering", "no");
    const response = await createAgentUIStreamResponse({
      agent: result.agent,
      uiMessages: body.messages,
      abortSignal: signal,
      onError: () => safeProviderStreamError(),
      headers,
      keepAliveMs: 10000,
    });
    if (!response.body) {
      await result.close();
      return new Response(null, {
        status: response.status,
        headers: streamHeaders(headers, response.headers),
      });
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
        } catch {
          // The SDK's onError callback already emits a safe UIMessage error.
          // Close rather than forwarding an SDK exception or provider body.
          try {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "error",
                  errorText: safeProviderStreamError(),
                })}\n\n`
              )
            );
            controller.close();
          } catch {}
        } finally {
          await result.close();
        }
      },
      async cancel() {
        await reader.cancel().catch(() => {});
        await result.close();
      },
    });
    return new Response(stream, {
      status: response.status,
      headers: streamHeaders(headers, response.headers),
    });
  } catch (error) {
    await cleanup?.();
    if (error instanceof RequestPolicyError)
      return fail(error.message, error.status);
    if (error instanceof BYOKPolicyError)
      return fail(error.message, error.status);
    if (signal.aborted) return fail("Request cancelled or timed out.", 408);
    const status = upstreamErrorStatus(error);
    return fail(safeProviderErrorMessage(error), status, status === 429 ? "60" : undefined);
  }
}
