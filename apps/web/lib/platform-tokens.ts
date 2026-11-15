import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getNeonSql } from "./db/client";
import { PlatformSetupRequiredError } from "./platform-policy";

export function tokenDatabase() {
  const sql = getNeonSql();
  if (!sql) throw new PlatformSetupRequiredError("Token storage is unavailable.");
  return sql;
}

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePlatformToken(userId: string, label: string) {
  const token = `ais_${randomBytes(32).toString("base64url")}`;
  const [record] = await tokenDatabase()`
    INSERT INTO aisdk_pro.platform_token (id, user_id, label, prefix, digest)
    VALUES (${randomUUID()}, ${userId}, ${label}, ${token.slice(0, 12)}, ${digest(token)})
    RETURNING id, label, prefix, scope, created_at, expires_at
  `;
  return { token, record };
}

export async function repositoryReader(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer (ais_[A-Za-z0-9_-]{43})$/i.exec(authorization);
  if (!match) return null;

  const [record] = await tokenDatabase()`
    SELECT user_id FROM aisdk_pro.platform_token
    WHERE digest = ${digest(match[1])} AND scope = 'repo:read' AND expires_at > now()
  `;
  return typeof record?.user_id === "string" ? record.user_id : null;
}
