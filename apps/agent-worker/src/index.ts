import { routeAgentRequest } from "agents/routing";
import { ChatAgent } from "./chat-agent";
import { BudgetCoordinator } from "./quota-guard";
import { tokenFromRequest, verifyAgentToken } from "./token";
import type { Env } from "./types";

export { ChatAgent, BudgetCoordinator };

function allowedOrigin(origin: string | null, env: Env): boolean {
  return Boolean(origin && env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).includes(origin));
}

function withCors(response: Response, origin: string): Response {
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Vary", "Origin");
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function failure(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({ status: "up", model: "@cf/zai-org/glm-4.7-flash" }, { headers: { "Cache-Control": "no-store" } });
    }

    const origin = request.headers.get("Origin");
    if (!allowedOrigin(origin, env)) return failure("Origin is not allowed.", 403);
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin!);
    }

    if (url.pathname === "/usage" && request.method === "GET") {
      const claims = await verifyAgentToken(tokenFromRequest(request), env.AGENT_AUTH_SECRET);
      if (!claims) return withCors(failure("Unauthorized", 401), origin!);
      const stub = env.BUDGET.get(env.BUDGET.idFromName("global"));
      const budgetResponse = await stub.fetch(
        "https://budget.internal/status?userId=" + encodeURIComponent(claims.sub)
      );
      return withCors(budgetResponse, origin!);
    }

    const check = async (req: Request, route: { className: string; name: string }) => {
      // BudgetCoordinator is only callable through its internal binding, never public routing.
      if (route.className !== "CHAT_AGENT" && route.className !== "ChatAgent") {
        return failure("Not found", 404);
      }
      const claims = await verifyAgentToken(tokenFromRequest(req), env.AGENT_AUTH_SECRET);
      if (!claims) return failure("Unauthorized", 401);
      if (route.name !== `${claims.sub}:${claims.tid}`) return failure("Forbidden", 403);
      return req;
    };

    const response = await routeAgentRequest(request, env, {
      onBeforeConnect: check,
      onBeforeRequest: check,
    });
    return withCors(response ?? failure("Not found", 404), origin!);
  },
} satisfies ExportedHandler<Env>;
