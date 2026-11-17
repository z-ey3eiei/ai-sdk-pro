import { AIChatAgent } from "@cloudflare/ai-chat";
import { convertToModelMessages, streamText } from "ai";
import { createAI } from "agents/models/ai-sdk";
import { verifyAgentToken } from "./token";
import type { Env } from "./types";

const MAX_INPUT_CHARS = 4000;
const MAX_CONTEXT_BYTES = 48_000;
const MAX_OUTPUT_TOKENS = 1024;

type FinishCallback = Parameters<AIChatAgent<Env>["onChatMessage"]>[0];
type ChatOptions = Parameters<AIChatAgent<Env>["onChatMessage"]>[1];

async function budgetCall(env: Env, route: string, body: unknown): Promise<Response> {
  const stub = env.BUDGET.get(env.BUDGET.idFromName("global"));
  return stub.fetch("https://budget.internal" + route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export class ChatAgent extends AIChatAgent<Env> {
  maxPersistedMessages = 200;
  messageConcurrency = "latest" as const;

  override async onChatMessage(
    onFinish?: FinishCallback,
    options?: ChatOptions
  ): Promise<Response> {
    const body = options?.body;
    const token = typeof body?.token === "string" ? body.token : null;
    const claims = await verifyAgentToken(token, this.env.AGENT_AUTH_SECRET);
    if (!claims) return Response.json({ error: "Chat session expired. Sign in again." }, { status: 401 });
    if (this.ctx.id.name !== `${claims.sub}:${claims.tid}`) {
      return Response.json({ error: "This conversation belongs to another user." }, { status: 403 });
    }

    const last = this.messages.at(-1);
    if (!last || last.role !== "user" || last.parts.some(part => part.type !== "text")) {
      return Response.json({ error: "Expected a plain-text user message." }, { status: 400 });
    }
    const text = last.parts.map(part => part.type === "text" ? part.text : "").join("");
    if (!text.trim() || text.length > MAX_INPUT_CHARS) {
      return Response.json({ error: `Message exceeds ${MAX_INPUT_CHARS} characters.` }, { status: 413 });
    }

    // The UI transcript persists 200 messages; inference reads a bounded final 16.
    const context = this.messages.slice(-16);
    const contextBytes = new TextEncoder().encode(JSON.stringify(context)).length;
    if (contextBytes > MAX_CONTEXT_BYTES) {
      return Response.json({ error: "Conversation context is too large. Start a new thread." }, { status: 413 });
    }

    const requestId = options?.requestId || crypto.randomUUID();
    // Over-reserve input by 4x UTF-8 bytes; cap output to bound spending before inference.
    const reservationResponse = await budgetCall(this.env, "/reserve", {
      requestId,
      userId: claims.sub,
      inputTokenCap: contextBytes * 4,
      outputTokenCap: MAX_OUTPUT_TOKENS,
    });
    if (!reservationResponse.ok) {
      const result: { reason?: string } = await reservationResponse.json();
      return Response.json({ error: result.reason ?? "Keyless usage limit reached." }, { status: 429 });
    }

    const ai = createAI({ binding: this.env.AI });
    try {
      const result = streamText({
        model: ai("@cf/zai-org/glm-4.7-flash"),
        system: "You are the ai-sdk.pro assistant. Answer clearly and concisely. Do not claim to run deployments.",
        messages: await convertToModelMessages(context),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: options?.abortSignal,
        onFinish: async event => {
          // Always reconcile actual usage before completing the protocol callback.
          await budgetCall(this.env, "/settle", {
            requestId,
            inputTokens: event.usage.inputTokens ?? contextBytes * 4,
            outputTokens: event.usage.outputTokens ?? MAX_OUTPUT_TOKENS,
          });
          if (onFinish) await onFinish(event);
        },
      });
      return result.toUIMessageStreamResponse();
    } catch {
      // Reservation stays charged as a conservative safety bound on unknown inference costs.
      return Response.json({ error: "The edge model is temporarily unavailable." }, { status: 503 });
    }
  }
}
