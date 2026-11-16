import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { neon } from "@neondatabase/serverless";

async function main(): Promise<void> {
  const databaseUrl = process.env.NEON_DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("NEON_DATABASE_URL is required for platform:migrate.");
    process.exitCode = 1;
    return;
  }

  const sql = neon(databaseUrl);
  for (const name of ["0001_platform.sql", "0006_platform_tokens.sql", "0007_deployment_intake.sql"]) {
    const migrationPath = resolve(__dirname, "..", "migrations", name);
    const migration = await readFile(migrationPath, "utf8");
    const statements = migration
      .split(";")
      .map(statement => statement.trim())
      .filter(Boolean);
    await sql.transaction(statements.map(statement => sql.query(statement, [])));
    console.log(`Applied platform migration ${name}.`);
  }
}

void main().catch(() => {
  console.error("Platform migration failed.");
  process.exitCode = 1;
});
