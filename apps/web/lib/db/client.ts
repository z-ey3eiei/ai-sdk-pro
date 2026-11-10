import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { dbSchema } from "./schema";

export type PlatformDatabase = NeonHttpDatabase<typeof dbSchema>;
export type PlatformSql = ReturnType<typeof neon>;

let sqlClient: PlatformSql | null = null;
let databaseClient: PlatformDatabase | null = null;
let databaseUrlForClient: string | null = null;

export function getNeonDatabaseUrl(): string | null {
  const value = process.env.NEON_DATABASE_URL?.trim();
  return value ? value : null;
}

export function getNeonSql(): PlatformSql | null {
  const url = getNeonDatabaseUrl();
  if (!url) return null;
  if (!sqlClient || databaseUrlForClient !== url) {
    sqlClient = neon(url);
    databaseUrlForClient = url;
    databaseClient = null;
  }
  return sqlClient;
}

export function getPlatformDb(): PlatformDatabase | null {
  const sql = getNeonSql();
  if (!sql) return null;
  if (!databaseClient) {
    databaseClient = drizzle(sql, { schema: dbSchema, logger: false });
  }
  return databaseClient;
}

export function resetDatabaseClientsForTests(): void {
  sqlClient = null;
  databaseClient = null;
  databaseUrlForClient = null;
}
