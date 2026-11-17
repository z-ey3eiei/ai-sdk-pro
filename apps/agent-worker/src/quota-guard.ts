import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";
import {
  MAX_DAILY_QUESTIONS,
  MAX_MONTHLY_BUDGET_MICROS,
  INPUT_RATE_MICROS_PER_MILLION,
  OUTPUT_RATE_MICROS_PER_MILLION,
} from "./types";

export function costMicros(inputTokens: number, outputTokens: number): number {
  if (![inputTokens, outputTokens].every(v => Number.isSafeInteger(v) && v >= 0)) {
    throw new Error("Invalid token budget.");
  }
  return Math.ceil(
    (inputTokens * INPUT_RATE_MICROS_PER_MILLION +
      outputTokens * OUTPUT_RATE_MICROS_PER_MILLION) / 1_000_000
  );
}

type ReserveInput = {
  requestId: string;
  userId: string;
  inputTokenCap: number;
  outputTokenCap: number;
};

type FinalizeInput = {
  requestId: string;
  inputTokens: number;
  outputTokens: number;
};

type BudgetResult =
  | { allowed: true; remaining: number; remainingBudgetMicros: number }
  | { allowed: false; reason: string; remaining?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReserveInput(value: unknown): value is ReserveInput {
  if (!isRecord(value)) return false;
  return typeof value.requestId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(value.requestId) &&
    typeof value.userId === "string" && value.userId.length > 0 && value.userId.length <= 256 &&
    Number.isSafeInteger(value.inputTokenCap) && Number(value.inputTokenCap) >= 0 && Number(value.inputTokenCap) <= 200_000 &&
    Number.isSafeInteger(value.outputTokenCap) && Number(value.outputTokenCap) >= 1 && Number(value.outputTokenCap) <= 2048;
}

function isFinalizeInput(value: unknown): value is FinalizeInput {
  return isRecord(value) &&
    typeof value.requestId === "string" &&
    Number.isSafeInteger(value.inputTokens) && Number(value.inputTokens) >= 0 &&
    Number.isSafeInteger(value.outputTokens) && Number(value.outputTokens) >= 0;
}

export class BudgetCoordinator extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS daily_usage(
        day TEXT NOT NULL,
        user_id TEXT NOT NULL,
        questions INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(day, user_id)
      );
      CREATE TABLE IF NOT EXISTS reservations(
        request_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        day TEXT NOT NULL,
        month TEXT NOT NULL,
        reserved_micros INTEGER NOT NULL,
        actual_micros INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL CHECK(state IN ('pending','settled','cancelled')),
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_budget_month ON reservations(month, state);
    `);
  }

  private spentMicros(month: string): number {
    const row = this.ctx.storage.sql.exec<{ spent: number }>(`
      SELECT COALESCE(SUM(CASE WHEN state = 'settled' THEN actual_micros ELSE reserved_micros END), 0) AS spent
      FROM reservations WHERE month = ? AND state != 'cancelled'
    `, month).one();
    return Number(row.spent);
  }

  private todayCount(day: string, userId: string): number {
    return Number(this.ctx.storage.sql.exec<{ questions: number }>(
      "SELECT questions FROM daily_usage WHERE day = ? AND user_id = ?", day, userId
    ).toArray()[0]?.questions ?? 0);
  }

  private reserve(input: ReserveInput): BudgetResult {
    const date = new Date();
    const day = date.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const micros = costMicros(input.inputTokenCap, input.outputTokenCap);
    return this.ctx.storage.transactionSync(() => {
      const existing = this.ctx.storage.sql.exec<{ state: string }>(
        "SELECT state FROM reservations WHERE request_id = ?", input.requestId
      ).toArray()[0];
      if (existing) return { allowed: false, reason: "Duplicate request identifier." };
      const used = this.todayCount(day, input.userId);
      if (used >= MAX_DAILY_QUESTIONS) return { allowed: false, reason: "Daily question limit reached.", remaining: 0 };
      const spent = this.spentMicros(month);
      if (spent + micros > MAX_MONTHLY_BUDGET_MICROS) {
        return { allowed: false, reason: "Monthly inference budget exhausted." };
      }
      this.ctx.storage.sql.exec(`
        INSERT INTO daily_usage(day, user_id, questions) VALUES(?, ?, 1)
        ON CONFLICT(day, user_id) DO UPDATE SET questions = questions + 1
      `, day, input.userId);
      this.ctx.storage.sql.exec(`
        INSERT INTO reservations(request_id,user_id,day,month,reserved_micros,state,created_at)
        VALUES(?,?,?,?,?,'pending',?)
      `, input.requestId, input.userId, day, month, micros, Date.now());
      return {
        allowed: true,
        remaining: MAX_DAILY_QUESTIONS - used - 1,
        remainingBudgetMicros: MAX_MONTHLY_BUDGET_MICROS - spent - micros,
      };
    });
  }

  private settle(input: FinalizeInput): Response {
    const actualMicros = costMicros(input.inputTokens, input.outputTokens);
    return this.ctx.storage.transactionSync(() => {
      const record = this.ctx.storage.sql.exec<{
        state: string; reserved_micros: number;
      }>("SELECT state,reserved_micros FROM reservations WHERE request_id = ?", input.requestId).toArray()[0];
      if (!record) return Response.json({ error: "Reservation not found." }, { status: 404 });
      if (record.state !== "pending") return Response.json({ ok: true, repeated: true });
      // Max caps are reserved before inference; unexpected overuse must fail closed and remain accounted for.
      this.ctx.storage.sql.exec(
        "UPDATE reservations SET state = 'settled', actual_micros = ? WHERE request_id = ?",
        Math.max(actualMicros, 0), input.requestId
      );
      return Response.json({ ok: true, exceededReservation: actualMicros > record.reserved_micros });
    });
  }

  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (request.method === "GET" && pathname === "/status") {
      const userId = new URL(request.url).searchParams.get("userId");
      if (!userId) return Response.json({ error: "Missing user." }, { status: 400 });
      const day = new Date().toISOString().slice(0, 10);
      const used = this.todayCount(day, userId);
      return Response.json({
        used,
        remaining: Math.max(0, MAX_DAILY_QUESTIONS - used),
        remainingBudgetMicros: Math.max(0, MAX_MONTHLY_BUDGET_MICROS - this.spentMicros(day.slice(0, 7))),
      });
    }
    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    let value: unknown;
    try { value = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
    if (pathname === "/reserve") {
      if (!isReserveInput(value)) return Response.json({ error: "Invalid reservation." }, { status: 400 });
      const result = this.reserve(value);
      return Response.json(result, { status: result.allowed ? 200 : 429 });
    }
    if (pathname === "/settle") {
      if (!isFinalizeInput(value)) return Response.json({ error: "Invalid usage." }, { status: 400 });
      return this.settle(value);
    }
    return new Response("Not found", { status: 404 });
  }
}
